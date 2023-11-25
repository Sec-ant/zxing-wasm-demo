import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, type PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { packages } from "./package-lock.json";

function resolvePath(path: string) {
  return fileURLToPath(new URL(path, import.meta.url));
}

const zxingWasmVersion = packages["node_modules/zxing-wasm"].version;

export default defineConfig({
  build: {
    outDir: resolvePath("./dist"),
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: resolvePath("./node_modules/zxing-wasm/dist/reader/*.wasm"),
          dest: `./wasm/reader/${zxingWasmVersion}`,
        },
      ],
    }),
    visualizer({
      emitFile: true,
    }) as PluginOption,
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        navigateFallbackDenylist: [/stats\.html(\?|$)/],
        globIgnores: ["stats.html"],
        globPatterns: ["**/*.{js,css,html,woff,woff2,wasm}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "jsdelivr-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fastly\.jsdelivr\.net\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "jsdelivr-fastly-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/registry\.npmmirror\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "npmmirror-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/unpkg\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "unpkg-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: "ZXing WASM Demo",
        short_name: "ZXing WASM Demo",
        description: "A ZXing WASM demo to show its basic functions",
        theme_color: "#1976d2",
        icons: [
          {
            src: "/icons/pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "/icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "/screenshots/wide.png",
            sizes: "2560x1600",
            type: "image/png",
            form_factor: "wide",
            label: "Homescreen",
          },
        ],
      },
    }),
  ],
  define: {
    ZXING_WASM_VERSION: JSON.stringify(zxingWasmVersion),
  },
});
