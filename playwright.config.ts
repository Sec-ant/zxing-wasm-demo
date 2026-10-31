import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  fullyParallel: true,
  workers: 3,
  use: {
    baseURL: "http://127.0.0.1:4180/zxing-wasm-demo/",
    permissions: ["clipboard-read", "clipboard-write", "camera"],
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 950 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "pnpm exec vite preview --host 127.0.0.1 --port 4180 --strictPort",
    url: "http://127.0.0.1:4180/zxing-wasm-demo/",
    reuseExistingServer: false,
  },
});
