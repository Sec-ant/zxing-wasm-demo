import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("reader toolbar has deliberate rows at source-width boundaries and stays stable after import", async ({
  page,
}, info) => {
  test.skip(Boolean(info.project.use.isMobile));
  await page.goto("./");
  await page.getByRole("navigation", { name: "Workspace" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  const widths = [
    820, 823, 824, 900, 919, 920, 943, 944, 1024, 1279, 1280, 1440, 320, 390,
  ];
  const inspect = async (width: number) => {
    await page.setViewportSize({ width, height: 900 });
    // The media subscription moves keyed panes to preserve mobile keyboard order.
    await expect(page.locator(".decode-workspace > :first-child")).toHaveClass(
      width <= 800 ? /canvas-pane/ : /inspector/,
    );
    await page.evaluate(() => scrollTo(0, 0));
    await expect(
      page
        .locator(".reader-image-toolbar")
        .getByRole("button", { name: "Upload images", exact: true }),
    ).toBeVisible();
    return page.locator(".reader-image-toolbar").evaluate((toolbar) => {
      const source = toolbar.parentElement!.getBoundingClientRect();
      const rect = toolbar.getBoundingClientRect();
      const controls = [...toolbar.querySelectorAll("button")].map((button) => {
        const r = button.getBoundingClientRect();
        return {
          x: r.x,
          right: r.right,
          y: r.y,
          center: r.y + r.height / 2,
          width: r.width,
        };
      });
      return {
        sourceWidth: source.width,
        left: source.left,
        right: source.right,
        height: rect.height,
        controls,
      };
    });
  };
  const empty = new Map<number, Awaited<ReturnType<typeof inspect>>>();
  for (const width of widths) {
    const layout = await inspect(width);
    empty.set(width, layout);
    const mode = layout.sourceWidth < 480 ? "stacked" : "single";
    const [image, camera, rescan, url, folder, upload] = layout.controls;
    expect(Math.abs(image.center - camera.center)).toBeLessThan(1);
    expect(Math.abs(image.center - rescan.center)).toBeLessThan(1);
    if (mode === "single")
      expect(Math.abs(image.center - upload.center)).toBeLessThan(1);
    else expect(url.center - image.center).toBeGreaterThan(30);
    expect(Math.abs(url.center - folder.center)).toBeLessThan(1);
    expect(Math.abs(url.center - upload.center)).toBeLessThan(1);
    for (const control of layout.controls) {
      expect(control.x).toBeGreaterThanOrEqual(layout.left);
      expect(control.right).toBeLessThanOrEqual(layout.right + 1);
    }
    expect(folder.x - url.right).toBeGreaterThanOrEqual(3);
    expect(upload.x - folder.right).toBeGreaterThanOrEqual(3);
  }
  await page.getByRole("button", { name: "QR Code", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("hello-world");
  for (const width of widths) {
    const loaded = await inspect(width);
    expect(loaded.height).toBe(empty.get(width)!.height);
    expect(loaded.controls).toEqual(empty.get(width)!.controls);
  }
});

test("a narrow result dock keeps metadata together and reveals expanded diagnostics locally", async ({
  page,
}, info) => {
  test.skip(Boolean(info.project.use.isMobile));
  await page.setViewportSize({ width: 834, height: 900 });
  await page.goto("./");
  await page
    .getByLabel("Upload images", { exact: true })
    .setInputFiles(resolve("public/samples/datamatrix.png"));
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("HELLO");
  const exterior = () =>
    page.evaluate(() =>
      [".inspector", ".canvas-pane", ".results-pane"].map((selector) => {
        const r = document.querySelector(selector)!.getBoundingClientRect();
        return [r.x + scrollX, r.y + scrollY, r.width, r.height];
      }),
    );
  const initial = await exterior();
  const meta = await page.locator(".result-meta").evaluate((node) =>
    [...node.children].map((child) => {
      const r = child.getBoundingClientRect();
      return {
        top: r.top,
        height: r.height,
        value: child.querySelector("dd")!.textContent,
      };
    }),
  );
  expect(meta[0].value).toBe("Data Matrix");
  expect(meta[0].height).toBeLessThan(24);
  expect(new Set(meta.slice(1).map((item) => item.top)).size).toBe(1);
  await page.getByRole("button", { name: "Diagnostics", exact: true }).click();
  await expect
    .poll(() =>
      page.locator(".diagnostic-flags").evaluate((flags) => {
        const bounds = flags
          .closest(".results-scroll")!
          .getBoundingClientRect();
        const rect = flags.getBoundingClientRect();
        return rect.top >= bounds.top && rect.bottom <= bounds.bottom;
      }),
    )
    .toBe(true);
  expect(await exterior()).toEqual(initial);
  await page.getByRole("textbox", { name: "Result JSON", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Result JSON", exact: true }),
  ).toBeFocused();
  expect(await exterior()).toEqual(initial);
});
