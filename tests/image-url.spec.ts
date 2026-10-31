import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

// These tests gate mocked network responses; the PWA's fetch handler must not bypass them.
test.use({ serviceWorkers: "block" });

test("URL input belongs to the image toolbar and opens without moving the workspace", async ({
  page,
}) => {
  let release!: () => void;
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("https://images.example/working.png", async (route) => {
    await response;
    await route.fulfill({
      path: resolve("public/samples/qrcode.png"),
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
    });
  });
  await page.goto("./");
  await page.getByRole("button", { name: "QR Code", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("hello-world");
  const trigger = page.getByRole("button", {
    name: "Open image URL",
    exact: true,
  });
  await expect(
    page
      .getByRole("complementary", { name: "Reader controls" })
      .getByRole("button", { name: "Open image URL" }),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".reader-image-toolbar")
      .getByRole("button", { name: "Open image URL" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choose folder", exact: true }),
  ).toBeVisible();
  const rectangles = () =>
    page.evaluate(() =>
      [
        ".inspector",
        ".canvas-pane",
        ".results-pane",
        ".artboard",
        ".reader-image-toolbar",
      ].map((selector) => {
        const r = document.querySelector(selector)!.getBoundingClientRect();
        return [r.x + scrollX, r.y + scrollY, r.width, r.height];
      }),
    );
  const initial = await rectangles();
  await trigger.click();
  const popup = page.getByRole("dialog", { name: "Image URL", exact: true });
  const input = popup.getByRole("textbox", { name: "Image URL", exact: true });
  await expect(popup).toBeVisible();
  expect(await rectangles()).toEqual(initial);
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(input).toBeFocused();
  await input.fill("https://images.example/working.png");
  await input.press("Enter");
  await expect(
    popup.getByRole("button", { name: "Open image" }),
  ).toBeDisabled();
  expect(await rectangles()).toEqual(initial);
  release();
  await expect(popup).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("hello-world");
  // Imported artwork adds a filmstrip, while settings and allocated panes stay fixed.
  expect((await rectangles()).slice(0, 3)).toEqual(initial.slice(0, 3));
});

test("URL failures preserve the form, narrow screens fit, and switching to camera cancels loading", async ({
  page,
}, info) => {
  if (info.project.name === "mobile")
    await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("./");
  const trigger = page.getByRole("button", {
    name: "Open image URL",
    exact: true,
  });
  await trigger.click();
  const popup = page.getByRole("dialog", { name: "Image URL", exact: true });
  const input = popup.getByRole("textbox", { name: "Image URL", exact: true });
  await input.fill("file:///image.png");
  await input.press("Enter");
  await expect(popup.getByRole("alert")).toContainText("HTTP or HTTPS");
  await expect(input).toHaveValue("file:///image.png");
  expect(
    await popup.evaluate((n) => {
      const r = n.getBoundingClientRect();
      return r.left >= 11 && r.right <= innerWidth - 11;
    }),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  let release!: () => void;
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("https://images.example/slow.png", async (route) => {
    await response;
    await route.fulfill({
      path: resolve("public/samples/qrcode.png"),
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
    });
  });
  await trigger.click();
  await input.fill("https://images.example/slow.png");
  const request = page.waitForRequest("https://images.example/slow.png");
  await input.press("Enter");
  await request;
  const cancelled = page.waitForEvent("requestfailed", {
    predicate: (request) => request.url() === "https://images.example/slow.png",
  });
  await page.getByRole("tab", { name: "Camera", exact: true }).click();
  await cancelled;
  release();
  await expect(popup).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "Camera", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Image", exact: true }).click();
  await expect(page.locator(".filmstrip-item")).toHaveCount(0);
  await expect(trigger).toBeVisible();
});
