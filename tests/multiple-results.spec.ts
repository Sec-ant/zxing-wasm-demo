import { expect, test } from "@playwright/test";

test("Reader precedes Writer and multiple symbols have numbered, selectable results", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("navigation", { name: "Workspace" }).getByRole("tab"),
  ).toHaveText(["Reader", "Writer"]);
  await page.getByRole("button", { name: "Multi", exact: true }).click();
  const rows = page
    .getByRole("group", { name: "Detected symbols" })
    .getByRole("button");
  await expect(rows).toHaveCount(2);
  await expect(page.locator(".image-overlay .overlay-index text")).toHaveText([
    "1",
    "2",
  ]);
  await expect(page.locator(".image-overlay polygon")).toHaveCount(4);
  const payload = page.getByRole("textbox", {
    name: "Decoded text",
    exact: true,
  });
  const first = await payload.inputValue();
  const settingsY = () =>
    page
      .locator(".inspector")
      .evaluate((n) => n.getBoundingClientRect().y + scrollY);
  const initialY = await settingsY();
  await rows.nth(1).click();
  await expect(rows.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(payload).not.toHaveValue(first);
  await expect(
    page.locator(".image-overlay > g[data-active='true'] .overlay-index text"),
  ).toHaveText("2");
  expect(new Set([first, await payload.inputValue()])).toEqual(
    new Set([
      "https://github.com/Sec-ant/zxing-wasm",
      "https://sec-ant.github.io/zxing-wasm/docs/",
    ]),
  );
  await page
    .getByRole("button", { name: "Advanced options", exact: true })
    .click();
  const limit = page.getByRole("spinbutton", {
    name: "Maximum symbols · 0 is unlimited",
    exact: true,
  });
  await limit.fill("1");
  await limit.blur();
  await expect(page.locator(".result-state")).toHaveText("1 symbol");
  await expect(page.locator(".image-overlay polygon")).toHaveCount(2);
  await expect(page.locator(".result-meta dd").first()).not.toHaveText("");
  await limit.fill("0");
  await limit.blur();
  await expect(rows).toHaveCount(2);
  expect(await settingsY()).toBe(initialY);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("camera keeps the chosen payload and matching outline when detection order changes", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.addInitScript(() => {
    Object.assign(window, { reverseResults: false, cameraResultFrames: 0 });
    const Native = window.Worker;
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", ({ data }) => {
          if (!data.value?.results) return;
          const state = window as unknown as {
            reverseResults: boolean;
            cameraResultFrames: number;
          };
          if (state.reverseResults) data.value.results.reverse();
          state.cameraResultFrames++;
        });
      }
    };
    navigator.mediaDevices.getUserMedia = async () => {
      const image = new Image();
      image.src = "/zxing-wasm-demo/samples/multi.png";
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d")!;
      const draw = () => context.drawImage(image, 0, 0);
      draw();
      const stream = canvas.captureStream(30);
      const timer = setInterval(draw, 1000 / 30);
      stream.getTracks().forEach((track) => {
        track.addEventListener("ended", () => clearInterval(timer));
      });
      return stream;
    };
  });
  await page.goto("./");
  await page.getByRole("tab", { name: "Camera", exact: true }).click();
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  const rows = page
    .getByRole("group", { name: "Detected symbols" })
    .getByRole("button");
  await expect(rows).toHaveCount(2);
  await rows.nth(1).click();
  const payload = page.getByRole("textbox", {
    name: "Decoded text",
    exact: true,
  });
  const chosen = await payload.inputValue();
  const frames = await page.evaluate(() => {
    const state = window as unknown as {
      reverseResults: boolean;
      cameraResultFrames: number;
    };
    state.reverseResults = true;
    return state.cameraResultFrames;
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { cameraResultFrames: number })
            .cameraResultFrames,
      ),
    )
    .toBeGreaterThan(frames + 5);
  await expect(payload).toHaveValue(chosen);
  await expect(rows.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(
      ".camera-stage .image-overlay > g[data-active='true'] .overlay-index text",
    ),
  ).toHaveText("1");
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
});
