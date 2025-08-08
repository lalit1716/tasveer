import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const manifestForPlugin = {
  registerType: "prompt",
  includeAssests: ["favicon.ico", "apple-touc-icon.png", "masked-icon.svg"],
  manifest: {
    name: "tasveer",
    short_name: "tasveer-app",
    description: "I am a simple vite app",
    icons: [
      {
        src: "/assets/icons/tasveer.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "favicon",
      },
     
    ],
    theme_color: "#181818",
    background_color: "#e0cc3b",
    display: "standalone",
    scope: "/",
    start_url: "/",
    orientation: "portrait",
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA(manifestForPlugin)],
});
