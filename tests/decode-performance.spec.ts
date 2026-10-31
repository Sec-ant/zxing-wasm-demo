import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("reader controls and source stay fixed across result states", async ({
  page,
}, info) => {
  if (info.project.name === "desktop")
    await page.setViewportSize({ width: 1024, height: 900 });
  await page.addInitScript(() => {
    const Native = window.Worker;
    Object.assign(window, { delayReads: false, readerStarts: 0 });
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (String(url).includes("codec.worker"))
          (window as unknown as { readerStarts: number }).readerStarts++;
      }
      postMessage(value: { kind?: string }, transfer: Transferable[] = []) {
        if (
          value.kind === "read" &&
          (window as unknown as { delayReads: boolean }).delayReads
        )
          setTimeout(() => super.postMessage(value, transfer), 350);
        else super.postMessage(value, transfer);
      }
    };
  });
  await page.goto("./");
  const payloadUsesAvailableWidth = () =>
    page.locator(".results-scroll").evaluate((panel) => {
      const style = getComputedStyle(panel);
      const available =
        panel.clientWidth -
        Number.parseFloat(style.paddingLeft) -
        Number.parseFloat(style.paddingRight);
      return (
        panel.querySelector(".results-payload")!.getBoundingClientRect().width /
        available
      );
    });
  expect(await payloadUsesAvailableWidth()).toBeCloseTo(1, 2);
  const rects = () =>
    page.evaluate(() =>
      [
        ".settings-section",
        ".reader-image-toolbar",
        ".canvas-pane",
        ".results-pane",
      ].map((selector) => {
        const r = document.querySelector(selector)!.getBoundingClientRect();
        return [r.x + scrollX, r.y + scrollY, r.width, r.height];
      }),
    );
  await page
    .getByLabel("Upload images", { exact: true })
    .setInputFiles(resolve("public/samples/qrcode.png"));
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("hello-world");
  const initial = await rects();
  await page.evaluate(() => {
    (window as unknown as { delayReads: boolean }).delayReads = true;
  });
  await page
    .getByRole("checkbox", { name: "Try rotated", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Decoded result", exact: true }),
  ).toHaveAttribute("aria-busy", "true");
  expect(await rects()).toEqual(initial);
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("hello-world");
  await page.getByRole("button", { name: "Diagnostics", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Result JSON", exact: true }),
  ).toBeVisible();
  expect(await rects()).toEqual(initial);
  await page
    .getByRole("combobox", { name: "Symbol family", exact: true })
    .click();
  await page.getByRole("option", { name: "Data Matrix", exact: true }).click();
  await expect(page.locator(".canvas-meta")).toContainText(
    "0 symbols detected",
  );
  expect(await payloadUsesAvailableWidth()).toBeCloseTo(1, 2);
  expect(await rects()).toEqual(initial);
  expect(
    await page.evaluate(
      () => (window as unknown as { readerStarts: number }).readerStarts,
    ),
  ).toBe(1);
});

test("mobile keyboard order follows source, output, then controls", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile");
  await page.goto("./");
  const order = await page
    .locator(".decode-workspace")
    .evaluate((node) => Array.from(node.children, (child) => child.className));
  expect(order[0]).toContain("canvas-pane");
  expect(order[1]).toContain("results-pane");
  expect(order[2]).toContain("inspector");
});

for (const fallback of [false, true]) {
  test(`camera drops busy frames, paints live geometry and uses ${fallback ? "ImageBitmap fallback" : "VideoFrame"}`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.addInitScript(
      ({ fallback }) => {
        if (fallback) {
          Object.defineProperty(window, "VideoFrame", { value: undefined });
          Object.defineProperty(
            HTMLVideoElement.prototype,
            "requestVideoFrameCallback",
            { value: undefined },
          );
        }
        const probe = {
          pending: 0,
          maxPending: 0,
          sent: [] as number[],
          completed: [] as number[],
          received: 0,
          kinds: [] as string[],
          readbacks: 0,
        };
        Object.assign(window, { cameraProbe: probe });
        const Native = window.Worker;
        window.Worker = class extends Native {
          constructor(url: string | URL, options?: WorkerOptions) {
            super(url, options);
            this.addEventListener("message", () => {
              probe.pending--;
              probe.completed.push(performance.now());
              probe.received++;
            });
          }
          postMessage(
            value: { kind?: string; image?: object },
            transfer: Transferable[] = [],
          ) {
            if (value.kind === "frame") {
              probe.pending++;
              probe.maxPending = Math.max(probe.maxPending, probe.pending);
              probe.sent.push(performance.now());
              probe.kinds.push(value.image!.constructor.name);
            }
            super.postMessage(value, transfer);
          }
        };
        const read = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function (
          ...args: Parameters<typeof read>
        ) {
          probe.readbacks++;
          return read.apply(this, args);
        };
        navigator.mediaDevices.getUserMedia = async () => {
          const image = new Image();
          image.src = "/zxing-wasm-demo/samples/qrcode.png";
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = 1280;
          canvas.height = 960;
          const context = canvas.getContext("2d")!;
          let frame = 0;
          const draw = () => {
            context.fillStyle = "white";
            context.fillRect(0, 0, 1280, 960);
            context.drawImage(image, 250 + (frame++ % 80), 120, 720, 720);
          };
          draw();
          const stream = canvas.captureStream(30);
          const timer = setInterval(draw, 1000 / 30);
          stream.getTracks().forEach((track) => {
            track.addEventListener("ended", () => clearInterval(timer));
          });
          return stream;
        };
      },
      { fallback },
    );
    await page.goto("./");
    await page.getByRole("tab", { name: "Camera", exact: true }).click();
    await page
      .getByRole("button", { name: "Start camera", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Decoded text", exact: true }),
    ).toHaveValue("hello-world");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { cameraProbe: { received: number } })
              .cameraProbe.received,
        ),
      )
      .toBeGreaterThan(15);
    const outline = page.locator(".camera-stage polygon").first();
    const points = await outline.getAttribute("points");
    await expect.poll(() => outline.getAttribute("points")).not.toBe(points);
    await expect(
      page.getByLabel("Camera performance", { exact: true }),
    ).toContainText("Read");
    const probe = await page.evaluate(
      () =>
        (
          window as unknown as {
            cameraProbe: {
              maxPending: number;
              sent: number[];
              completed: number[];
              kinds: string[];
              readbacks: number;
            };
          }
        ).cameraProbe,
    );
    // Measure scheduling overhead separately from decoding on different hardware.
    const schedulingGaps = probe.sent
      .slice(3)
      .map((time, index) => time - probe.completed[index + 2])
      .sort((a, b) => a - b);
    expect(schedulingGaps[Math.floor(schedulingGaps.length / 2)]).toBeLessThan(
      180,
    );
    expect(probe.maxPending).toBe(1);
    expect(probe.readbacks).toBe(0);
    expect(new Set(probe.kinds)).toEqual(
      new Set([fallback ? "ImageBitmap" : "VideoFrame"]),
    );
    await page
      .getByRole("checkbox", { name: "Try rotated", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Decoded text", exact: true }),
    ).toHaveValue("hello-world");
    await page
      .getByRole("button", { name: "Stop camera", exact: true })
      .click();
  });
}

test("diagnostics bounds binary rendering and exports complete data off-thread", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", ({ data }) => {
          const result = data.value?.results?.[0];
          if (result)
            result.symbol = {
              width: 1024,
              height: 1024,
              data: new Uint8ClampedArray(1024 * 1024),
            };
        });
      }
    };
  });
  await page.goto("./");
  await page
    .getByLabel("Upload images", { exact: true })
    .setInputFiles(resolve("public/samples/qrcode.png"));
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("hello-world");
  const controlsBefore = await page
    .locator(".settings-section")
    .evaluate((n) => {
      const r = n.getBoundingClientRect();
      return r.y + scrollY;
    });
  await page.getByRole("button", { name: "Diagnostics", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Result JSON", exact: true });
  await expect(field).toBeVisible();
  const preview = await field.inputValue();
  expect(preview.length).toBeLessThan(8000);
  expect(JSON.parse(preview).symbol.data).toMatchObject({
    type: "Uint8ClampedArray",
    byteLength: 1024 * 1024,
    truncated: true,
  });
  expect(
    await page
      .getByRole("textbox", { name: "Payload HEX", exact: true })
      .inputValue(),
  ).toBe("68 65 6c 6c 6f 2d 77 6f 72 6c 64");
  const layout = await page.locator(".diagnostic-flags").evaluate((n) => ({
    top: n.getBoundingClientRect().top,
    panel: n.parentElement!.getBoundingClientRect().top,
    columns: getComputedStyle(n).gridTemplateColumns,
  }));
  expect(layout.top - layout.panel).toBeLessThanOrEqual(8);
  expect(layout.columns.split(" ")).toHaveLength(2);
  expect(
    await page
      .locator(".hex-output")
      .evaluate((n) => getComputedStyle(n).wordBreak),
  ).toBe("normal");
  const jsonDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download full JSON", exact: true })
    .click();
  const file = await jsonDownload;
  const { readFile } = await import("node:fs/promises");
  const exported = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(exported.symbol.data).toHaveLength(1024 * 1024);
  expect(exported.bytes).toEqual(
    Array.from(new TextEncoder().encode("hello-world")),
  );
  expect(
    await page
      .locator(".settings-section")
      .evaluate((n) => n.getBoundingClientRect().y + scrollY),
  ).toBe(controlsBefore);
  const bytesDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download bytes", exact: true })
    .click();
  expect(await readFile((await (await bytesDownload).path())!, "utf8")).toBe(
    "hello-world",
  );
});
