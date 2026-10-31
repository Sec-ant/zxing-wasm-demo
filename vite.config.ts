import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/zxing-wasm-demo/",
  build: {
    rolldownOptions: {
      // This app is entirely client-rendered, including the Base UI components.
      checks: { moduleLevelDirective: false },
    },
  },
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,wasm,woff2,png,webp,svg,ico}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: "ZXing WASM Studio",
        short_name: "ZXing Studio",
        description:
          "Read, generate and inspect barcodes locally in your browser.",
        theme_color: "#fffcf0",
        background_color: "#fffcf0",
        display: "standalone",
        start_url: "/zxing-wasm-demo/",
        scope: "/zxing-wasm-demo/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
