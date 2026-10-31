import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const sample = (name: string) => resolve("public/samples", name);

test("published reader decodes matrix and linear formats with matching outlines", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  for (const [name, text, format] of [
    ["qrcode.png", "hello-world", "QR Code"],
    ["datamatrix.png", "HELLO", "Data Matrix"],
    ["aztec.png", "你 😀", "Aztec"],
    ["code128.png", "HELLO", "Code 128"],
    ["pdf417.png", "ZXing WASM Studio", "PDF417"],
  ]) {
    await page
      .getByLabel("Upload images", { exact: true })
      .setInputFiles(sample(name));
    await expect(
      page.getByRole("textbox", { name: "Decoded text", exact: true }),
    ).toHaveValue(text);
    await expect(page.locator(".result-meta dd").first()).toHaveText(format);
    await expect(page.locator(".image-overlay polygon")).toHaveCount(2);
    expect(
      await page.evaluate(() => {
        const area = document
          .querySelector(".artboard")!
          .getBoundingClientRect();
        return [".image-frame", ".image-frame img", ".image-overlay"].every(
          (selector) => {
            const rect = document
              .querySelector(selector)!
              .getBoundingClientRect();
            return (
              rect.top >= area.top &&
              rect.bottom <= area.bottom &&
              rect.left >= area.left &&
              rect.right <= area.right
            );
          },
        );
      }),
    ).toBe(true);
  }
  await expect(page.locator(".filmstrip-item")).toHaveCount(5);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("");
  await expect(page.locator(".filmstrip-item")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("real reader filters rerun imported images and preserve options", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByLabel("Upload images", { exact: true })
    .setInputFiles(sample("datamatrix.png"));
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("HELLO");
  await page
    .getByRole("combobox", { name: "Symbol family", exact: true })
    .click();
  await page.getByRole("option", { name: "QR Code", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("");
  await expect(page.locator(".canvas-meta")).toContainText(
    "0 symbols detected",
  );
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Symbol family", exact: true }),
  ).toContainText("QR Code");
  await expect(page.locator(".filmstrip-item")).toHaveCount(0);
});

test("generation, PNG and SVG exports and roundtrip use the published writer", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("tab", { name: "Writer", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Barcode content", exact: true })
    .fill("Roundtrip · 你 😀");
  await expect(
    page.getByRole("img", { name: "Generated QR Code" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Download barcode", exact: true })
    .click();
  const pngPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Download PNG" }).click();
  expect((await pngPromise).suggestedFilename()).toBe("zxing-QRCode.png");
  await page
    .getByRole("button", { name: "Download barcode", exact: true })
    .click();
  const svgPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Download SVG" }).click();
  expect((await svgPromise).suggestedFilename()).toBe("zxing-QRCode.svg");
  await page.getByRole("button", { name: "Read this code" }).click();
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("Roundtrip · 你 😀");
  await page.getByRole("tab", { name: "Writer", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Symbol format", exact: true })
    .click();
  await expect(
    page.getByRole("option", { name: "Data Matrix", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Barcode content", exact: true }),
  ).toHaveValue("Roundtrip · 你 😀");
});

test("corrupt storage, dark theme, share links and deliberate reset", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(() =>
    localStorage.setItem(
      "zxing-studio-workspace-v1",
      '{"mode":"encode","writer":{"format":"invalid","scale":-5},"reader":{"formats":"oops"}}',
    ),
  );
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Generated QR Code" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Barcode content", exact: true })
    .fill("Shared 你");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await page.getByRole("button", { name: "Copy share link" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain("workspace=");
  await page.goto(link);
  await expect(
    page.getByRole("textbox", { name: "Barcode content", exact: true }),
  ).toHaveValue("Shared 你");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Reset workspace", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Barcode content", exact: true }),
  ).toHaveValue("Shared 你");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Reset workspace", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Reset workspace", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Reader", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("image URL errors are actionable and invalid files do not crash", async ({
  page,
}) => {
  await page.route("https://images.example/fail.png", (route) =>
    route.fulfill({
      status: 404,
      body: "missing",
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await page.goto("./");
  await page
    .getByRole("button", { name: "Open image URL", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Image URL", exact: true })
    .fill("https://images.example/fail.png");
  await page.getByRole("button", { name: "Open image", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("HTTP 404");
  await page.keyboard.press("Escape");
  await page.getByLabel("Upload images", { exact: true }).setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.locator(".canvas-meta")).toContainText(
    "Failed to load image",
  );
});

test("camera opens only on request and stops on mode changes", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("tab", { name: "Camera", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start camera", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator("video")
      .evaluate((video: HTMLVideoElement) => video.srcObject),
  ).toBeNull();
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop camera", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".canvas-meta")).toContainText("scanning");
  await page.evaluate(() => {
    (window as unknown as { cameraTracks: MediaStreamTrack[] }).cameraTracks = (
      document.querySelector("video")!.srcObject as MediaStream
    ).getTracks();
  });
  await page.getByRole("tab", { name: "Image", exact: true }).click();
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { cameraTracks: MediaStreamTrack[] }
      ).cameraTracks.every((track) => track.readyState === "ended"),
    ),
  ).toBe(true);
});

test("workspaces have no serious accessibility violations or horizontal overflow", async ({
  page,
}) => {
  await page.goto("./");
  for (const [mode, theme] of [
    ["Reader", "light"],
    ["Writer", "light"],
    ["Reader", "dark"],
    ["Writer", "dark"],
  ]) {
    if (
      theme === "dark" &&
      !(await page.locator("html").getAttribute("class"))?.includes("dark")
    )
      await page
        .getByRole("button", { name: "Switch to dark theme", exact: true })
        .click();
    await page.getByRole("tab", { name: mode, exact: true }).click();
    if (mode === "Writer")
      await expect(
        page.getByRole("img", { name: "Generated QR Code" }),
      ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.effect?.getTiming().iterations !==
              Number.POSITIVE_INFINITY,
          )
          .map((animation) => animation.finished.catch(() => {})),
      ),
    );
    if (mode === "Reader")
      await page
        .getByRole("button", { name: "Open image URL", exact: true })
        .click();
    const report = await new AxeBuilder({ page }).analyze();
    expect(
      report.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);
    if (mode === "Reader") await page.keyboard.press("Escape");
  }
});

test("installed assets keep samples and codecs available offline", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "QR Code", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("hello-world");
  await page.getByRole("tab", { name: "Writer", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Generated QR Code" }),
  ).toBeVisible();
});
