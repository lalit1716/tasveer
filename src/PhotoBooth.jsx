import React, { useEffect, useRef, useState } from "react";

const filters = {
  None: "none",
  Sepia: "sepia(1)",
  Grayscale: "grayscale(1)",
  Vintage: "contrast(0.8) saturate(0.8)",
  Cool: "hue-rotate(180deg)",
  Warm: "sepia(0.2) saturate(1.2)",
  "High Contrast": "contrast(1.5)",
  Dream: "blur(1px) brightness(1.2)",
  Vignette: "none", // Keep as "none" for CSS filter
};

export default function PurikuraBooth() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const galleryRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [filter, setFilter] = useState("None");
  const [photos, setPhotos] = useState([]);
  const [showGallery, setShowGallery] = useState(false);
  const [photoCount, setPhotoCount] = useState(2);
  const [countdown, setCountdown] = useState(null);
  const [flash, setFlash] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownload, setIsDownload] = useState(false);

  useEffect(() => {
    enableCamera();
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (isDownload) return;
    if (videoRef.current) {
      const videoWrapper = videoRef.current.closest(".video-wrapper");
      if (!videoWrapper) return;

      // Apply regular filter
      videoRef.current.style.filter =
        filter === "Vignette" ? "none" : filters[filter];
      videoRef.current.style.transform = "scaleX(-1)";

      // Manage vignette overlay
      let vignetteOverlay = videoWrapper.querySelector(".vignette-overlay");

      if (filter === "Vignette") {
        if (!vignetteOverlay) {
          vignetteOverlay = document.createElement("div");
          vignetteOverlay.className = "vignette-overlay";
          vignetteOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            background: radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.8) 100%);
            z-index: 2;
          `;
          videoWrapper.appendChild(vignetteOverlay);
        }
      } else {
        if (vignetteOverlay) {
          vignetteOverlay.remove();
        }
      }
    }
  }, [filter]);

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  const capturePhotos = async () => {
    const totalPhotos = parseInt(photoCount);
    const captured = [];

    for (let i = 0; i < totalPhotos; i++) {
      setCountdown("1 Get Ready!");
      await wait(1000);
      setCountdown("2 Pose");
      await wait(1000);
      setCountdown("3 Smile!");
      await wait(1000);
      setCountdown(null);

      // Show flash
      setFlash(true);
      await wait(150);
      setFlash(false);

      // Capture image
      if (canvasRef.current && videoRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;

        // Apply CSS filter to canvas context for non-vignette effects
        ctx.filter = filter === "Vignette" ? "none" : filters[filter];
        ctx.translate(canvasRef.current.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);

        // Add vignette effect to captured image if Vignette filter is selected
        if (filter === "Vignette") {
          const gradient = ctx.createRadialGradient(
            canvasRef.current.width / 2,
            canvasRef.current.height / 2,
            0,
            canvasRef.current.width / 2,
            canvasRef.current.height / 2,
            Math.max(canvasRef.current.width, canvasRef.current.height) * 0.6
          );
          gradient.addColorStop(0, "rgba(0,0,0,0)");
          gradient.addColorStop(1, "rgba(0,0,0,0.7)");

          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        const dataURL = canvasRef.current.toDataURL("image/png");
        captured.push(dataURL);
      }

      await wait(700); // Pause before next shot
    }

    setPhotos(captured);
    setShowGallery(true);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const enableCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.style.transform = "scaleX(-1)";
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const handleBack = () => {
    setPhotos([]);
    setShowGallery(false);
    setCountdown(null);
    enableCamera();
  };

  const createCollage = () => {
    return new Promise((resolve) => {
      // Create a canvas element for drawing the collage
      const collageCanvas = document.createElement("canvas");
      const ctx = collageCanvas.getContext("2d");

      // ==== Layout constants - adjust these to change collage appearance ====
      const cardWidth = 320; // Total width of the collage card
      const cardPadding = 24; // Padding around the card content
      const photoWidth = 272; // Width of each photo (slightly smaller to match UI)
      const photoHeight = 180; // Height of each photo (adjusted for better ratio)
      const photoSpacing = 16; // Vertical space between photos
      const titleHeight = 100; // Height reserved for title/date area (reduced to bring photos closer to title)
      const buttonHeight = 0; // Space reserved at bottom (currently unused)
      const shadowPadding = 20; // Extra space around canvas for shadow to be visible

      // ==== Calculate card dimensions (without shadow padding) ====
      const cardActualHeight =
        titleHeight + // Space for title
        photos.length * photoHeight + // Height of all photos
        (photos.length - 1) * photoSpacing + // Spacing between photos
        cardPadding + // Only bottom padding (reduced from cardPadding * 2)
        buttonHeight; // Footer space

      // ==== Calculate total canvas dimensions (including shadow space) ====
      collageCanvas.width = cardWidth + shadowPadding * 2;
      collageCanvas.height = cardActualHeight + shadowPadding * 2;

      // ==== Draw background card with rounded corners and shadow ====
      // Set shadow properties BEFORE drawing
      ctx.shadowColor = "#121212"; // Semi-transparent black shadow
      ctx.shadowBlur = 5; // Soft blur effect
      ctx.shadowOffsetX = 0; // No horizontal offset
      ctx.shadowOffsetY = 0; // Slight vertical offset for depth

      ctx.fillStyle = "#ffffff"; // White background
      ctx.beginPath();
      // Draw the card centered within the canvas (offset by shadowPadding)
      ctx.roundRect(
        shadowPadding,
        shadowPadding,
        cardWidth,
        cardActualHeight,
        16
      );
      ctx.fill(); // Fill with shadow applied

      // ==== Reset shadow settings so it doesn't affect other elements ====
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // ==== Function to draw the title/date header ====
      const drawTitle = () => {
        ctx.fillStyle = "#7e22ce"; // Purple color matching UI

        // Try custom font first, fallback to system fonts if unavailable
        ctx.font = "700 26px 'Fleur De Leah', 'Brush Script MT', cursive";
        ctx.textAlign = "center"; // Center align text
        ctx.textBaseline = "middle"; // Vertical center alignment

        // Format current date as DD-MMM-YYYY (e.g., 06-Jul-2025)
        const dateStr = new Date()
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          .replace(/ /g, "-"); // Replace spaces with hyphens

        // Draw the date text centered with proper top padding
        ctx.fillText(
          dateStr,
          (cardWidth + shadowPadding * 2) / 2,
          shadowPadding + titleHeight / 2 + 5
        ); // Center in title area with top padding
      };

      // ==== Image loading and drawing logic ====
      let loadedImages = 0; // Counter for loaded images
      const totalImages = photos.length; // Total number of images to load

      // Handle case where no photos are provided
      if (totalImages === 0) {
        drawTitle(); // Still draw title
        resolve(collageCanvas.toDataURL()); // Return empty collage
        return;
      }

      // ==== Process each photo ====
      photos.forEach((photoSrc, index) => {
        const img = new Image(); // Create new image element

        // ==== Image load success handler ====
        img.onload = () => {
          // ==== Calculate position for this photo ====
          const x = shadowPadding + (cardWidth - photoWidth) / 2; // Center horizontally with shadow offset
          const y =
            shadowPadding + titleHeight + index * (photoHeight + photoSpacing); // Remove cardPadding from top

          // ==== Calculate scaling to maintain aspect ratio ====
          const imgAspectRatio = img.width / img.height; // Original image ratio
          const targetAspectRatio = photoWidth / photoHeight; // Target container ratio

          let drawWidth, drawHeight, offsetX, offsetY;

          if (imgAspectRatio > targetAspectRatio) {
            // Image is wider than container - fit to height, center horizontally
            drawHeight = photoHeight;
            drawWidth = drawHeight * imgAspectRatio;
            offsetX = (photoWidth - drawWidth) / 2; // Center horizontally
            offsetY = 0;
          } else {
            // Image is taller than container - fit to width, center vertically
            drawWidth = photoWidth;
            drawHeight = drawWidth / imgAspectRatio;
            offsetX = 0;
            offsetY = (photoHeight - drawHeight) / 2; // Center vertically
          }

          // ==== Draw image with rounded corners and proper scaling ====
          ctx.save(); // Save current canvas state
          ctx.beginPath();
          ctx.roundRect(x, y, photoWidth, photoHeight, 12); // Create rounded rectangle mask
          ctx.clip(); // Clip to rounded rectangle

          // Fill background in case image doesn't cover full area
          ctx.fillStyle = "#f3f4f6"; // Light gray background
          ctx.fill();

          // Draw the image centered and scaled within the clipped area
          ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
          ctx.restore(); // Restore canvas state (removes clipping)

          // ==== Add subtle border around image ====
          // ctx.strokeStyle = "#e5b4f3"; // Light purple border
          // ctx.lineWidth = 0.5; // Thin border
          // ctx.beginPath();
          // ctx.roundRect(x, y, photoWidth, photoHeight, 12);
          // ctx.stroke();

          // ==== Track loading progress ====
          loadedImages++;
          if (loadedImages === totalImages) {
            drawTitle(); // Draw title after all images loaded
            resolve(collageCanvas.toDataURL()); // Return completed collage
          }
        };

        // ==== Image load error handler ====
        img.onerror = () => {
          console.warn("Failed to load image:", photoSrc);
          loadedImages++;
          if (loadedImages === totalImages) {
            drawTitle(); // Still draw title even if images fail
            resolve(collageCanvas.toDataURL());
          }
        };

        // ==== Configure image loading ====
        img.crossOrigin = "anonymous"; // Handle CORS issues
        img.src = photoSrc; // Start loading the image
      });
    });
  };

  const handlePrint = async () => {
    try {
      const collageDataURL = await createCollage();
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Memories</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                img { max-width: 100%; max-height: 100%; }
              </style>
            </head>
            <body>
              <img src="${collageDataURL}" onload="window.print(); window.onafterprint = function(){ window.close(); }"/>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error("Error printing:", error);
      alert("Print failed. Please try again.");
    }
  };

  const handleDownload = async (setIsDownloading = null) => {
    try {
      // Set loading state if provided
      if (setIsDownloading) setIsDownloading(true);

      // Wait for font to load before creating collage
      try {
        await document.fonts.load("700 26px 'Fleur De Leah'");
      } catch (fontError) {
        console.warn("Font loading failed, using fallback:", fontError);
      }

      // Create the collage
      const collageDataURL = await createCollage();

      // Create and trigger download
      const link = document.createElement("a");
      link.href = collageDataURL;
      link.download = `memories-${new Date().toISOString().split("T")[0]}.png`;

      // Temporary append to body for Firefox compatibility
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Collage downloaded successfully!");
    } catch (error) {
      console.error("Error downloading collage:", error);

      // More specific error messages
      if (error.name === "SecurityError") {
        alert(
          "Download blocked by browser security. Please try again or check image sources."
        );
      } else if (error.message.includes("canvas")) {
        alert(
          "Error creating collage. Please check your images and try again."
        );
      } else {
        alert("Download failed. Please try again.");
      }
    } finally {
      // Reset loading state
      if (setIsDownloading) setIsDownloading(false);
    }
  };

  const handleClick = () => {
    setIsDownload(true);
    handleDownload(setIsDownloading);
  };

  return (
    <div className="min-h-screen w-vw bg-gradient-to-r from-[#FD9A3A] to-[#C49ED4] flex items-center justify-center p-6">
      {showGallery ? (
        <div className="flex flex-col gap-3 items-center h-auto">
          <div
            ref={galleryRef}
            style={{ background: "#fff", color: "#7e22ce" }}
            className="rounded-2xl p-6 shadow-xl max-h-screen overflow-y-auto flex flex-col gap-2 items-center  w-auto"
          >
            <h2 className="text-center text-xl font-bold  mb-4 fleur-de-leah-regular ">
              {new Date()
                .toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
                .replace(/ /g, "-")}
            </h2>
            <div className="flex flex-col items-center space-y-4  ">
              {photos.map((src, i) => (
                <div
                  key={i}
                  className="w-[300px] h-[200px] aspect-square  overflow-hidden rounded-lg relative group shadow-lg"
                >
                  <img
                    src={src}
width={1500}
height={1000}
                    alt={`snapshot-${i}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 ">
            <button
              onClick={handleBack}
              className="bg-[#C49ED4] text-white px-1 py-1 hover:bg-purple-700 transition-colors rounded-lg flex items-center justify-center md:justify-start gap-2 md:px-2 md:py-2"
            >
              <img
                src="/assets/icons/back.png"
                alt="back"
                className="w-[30px] h-[30px]"
              />
              <div className="yellowtail-regular hidden md:block text-xl pr-1.5">
                Back
              </div>
            </button>

            <button
              onClick={handlePrint}
              className="bg-[#FD9A3A] text-white px-1 py-1 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center md:justify-start gap-2 md:px-2 md:py-2"
            >
              <img
                src="/assets/icons/printer.png"
                alt="print"
                className="w-[30px] h-[30px]"
              />
              <div className="yellowtail-regular hidden md:block text-xl pr-1.5">
                Print
              </div>
            </button>

            <button
              onClick={handleClick}
              disabled={isDownloading}
              className={`px-1 py-1 rounded-lg transition-colors flex items-center justify-center md:justify-start gap-2 md:px-2 md:py-2 ${
                isDownloading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#D78FB1] hover:bg-blue-600"
              } text-white`}
            >
              {isDownloading ? (
                <>
                  <span className="animate-spin yellowtail-regular">⏳</span>
                  <span className="yellowtail-regular hidden md:block text-xl pr-1.5">
                    Creating...
                  </span>
                </>
              ) : (
                <>
                  <img
                    src="/assets/icons/download.png"
                    alt="download"
                    className="w-[30px] h-[30px]"
                  />
                  <div className="yellowtail-regular hidden md:block text-xl pr-1.5">
                    Download
                  </div>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#D78FB1] flex flex-col items-center space-y-6 p-10 w-full md:w-[55%] rounded-2xl">
          <div className="aspect-3/2 xl:aspect-none xl:w-[100%] xl:h-[500px] relative overflow-hidden rounded-xl shadow-md">
            <div className="video-wrapper relative w-full h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            {countdown && (
              <div className="text-4xl text-white font-bold animate-pulse absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[999] yellowtail-regular">
                {countdown}
              </div>
            )}

            {flash && (
              <div className="absolute top-0 left-0 w-full h-full bg-white opacity-80 z-[998] animate-flash pointer-events-none"></div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 w-full">
            <div className="text-lg font-semibold flex items-center gap-2">
              <img
                src="/assets/icons/photo.png"
                alt="filter"
                className="w-6 h-6"
              />
              <div className="yellowtail-regular text-white md:text-xl">
                Choose Filter
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-white yellowtail-regular text-base md:text-xl">
                Number of Photos
              </div>
              <select
                value={photoCount}
                onChange={(e) => setPhotoCount(e.target.value)}
                className="yellowtail-regular w-20 px-3 py-1 rounded-md bg-white border border-purple-300 text-purple-700 text-lg text-center shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition cursor-pointer"
              >
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* filters starts here  */}
          <div className="flex flex-wrap justify-center gap-4 border-3 border-dashed border-orange-300 rounded-bl-xl p-2">
            {Object.keys(filters).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1 rounded-bl-lg transition-colors cursor-pointer ${
                  filter === f
                    ? "bg-white text-purple-700 yellowtail-regular inset-shadow-indigo-500"
                    : "bg-purple-300 text-white hover:bg-purple-400 yellowtail-regular shadow-md"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={capturePhotos}
            disabled={countdown !== null}
            className="w-[150px] md:w-[300px] bg-white px-6 py-2 rounded-lg mt-4 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all yellowtail-regular flex items-center justify-center gap-2 cursor-pointer"
          >
            <img
              src="/assets/icons/camera.png"
              alt="camera"
              className="w-6 h-6"
            />
            <div className="yellowtail-regular">Click</div>
          </button>

          <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
        </div>
      )}
    </div>
  );
}
