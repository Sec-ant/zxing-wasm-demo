import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/zxing-wasm-demo/",
  plugins: [
    tailwindcss(),
    Icons({ compiler: "jsx", jsx: "react" }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "ZXing WASM Reader",
        short_name: "ZXing Reader",
        description:
          "A browser workbench for decoding barcodes with zxing-wasm.",
        theme_color: "#24837b",
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
