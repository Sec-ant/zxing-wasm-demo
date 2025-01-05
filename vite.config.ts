import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { type PluginOption, defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { ZXING_WASM_VERSION } from "zxing-wasm/reader";

function resolvePath(path: string) {
  return fileURLToPath(new URL(path, import.meta.url));
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
          dest: `./wasm/reader/${ZXING_WASM_VERSION}`,
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
            urlPattern: new RegExp(
              [
                `^${escapeRegExp(
                  `https://cdn.jsdelivr.net/npm/zxing-wasm@${ZXING_WASM_VERSION}`,
                )}`,
                `^${escapeRegExp(
                  `https://fastly.jsdelivr.net/npm/zxing-wasm@${ZXING_WASM_VERSION}`,
                )}`,
                `^${escapeRegExp(
                  `https://registry.npmmirror.com/zxing-wasm/${ZXING_WASM_VERSION}`,
                )}`,
                `^${escapeRegExp(
                  `https://unpkg.com/zxing-wasm@${ZXING_WASM_VERSION}`,
                )}`,
              ].join("|"),
              "i",
            ),
            handler: "CacheFirst",
            options: {
              cacheName: "cdn-cache",
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
            label: "Homescreen on desktop",
          },
          {
            src: "/screenshots/narrow.png",
            sizes: "1080x2400",
            type: "image/png",
            form_factor: "narrow",
            label: "Homescreen on mobile",
          },
        ],
      },
    }),
  ],
});
