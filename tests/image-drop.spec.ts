import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("dragging the current preview cannot import it again or show a drop error", async ({
  page,
}, info) => {
  test.skip(Boolean(info.project.use.isMobile));
  await page.goto("./");
  await page.getByRole("button", { name: "Multi", exact: true }).click();
  await expect(page.locator(".result-row")).toHaveCount(2);
  await page.locator(".result-row").nth(1).click();
  const chosen = await page
    .getByRole("textbox", { name: "Decoded text", exact: true })
    .inputValue();
  const image = page.locator(".image-frame img");
  const target = page.getByRole("region", {
    name: "Image drop target",
    exact: true,
  });
  await image.dragTo(target, { targetPosition: { x: 24, y: 24 } });
  await expect(page.locator(".canvas-meta")).not.toHaveClass(/has-error/);
  await expect(page.locator(".drop-message")).toHaveCount(0);
  await expect(page.locator(".filmstrip-item")).toHaveCount(1);
  await expect(page.locator(".result-state")).toHaveText("2 symbols");
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue(chosen);
});

test("external files and image URLs still import through the drop target", async ({
  page,
}) => {
  await page.goto("./");
  const target = page.getByRole("region", {
    name: "Image drop target",
    exact: true,
  });
  const bytes = Array.from(await readFile("public/samples/qrcode.png"));
  const file = await page.evaluateHandle((bytes) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([new Uint8Array(bytes)], "qrcode.png", { type: "image/png" }),
    );
    return transfer;
  }, bytes);
  await target.dispatchEvent("dragover", { dataTransfer: file });
  await expect(page.locator(".drop-message")).toBeVisible();
  await target.dispatchEvent("drop", { dataTransfer: file });
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("hello-world");
  const url = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.setData(
      "text/uri-list",
      new URL("samples/multi.png", location.href).href,
    );
    return transfer;
  });
  await target.dispatchEvent("dragover", { dataTransfer: url });
  await target.evaluate((node, transfer) => {
    node.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    );
    // Model the browser's protected drag store after the synchronous drop handler.
    transfer.clearData();
  }, url);
  await expect(page.locator(".result-state")).toHaveText("2 symbols");
  await expect(page.locator(".filmstrip-item")).toHaveCount(2);
  await expect(page.locator(".canvas-meta")).not.toHaveClass(/has-error/);
});

test("HTML picture and lazy images import separately with working source fallbacks", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(() => {
    const transfer = new DataTransfer();
    transfer.setData(
      "text/html",
      `<base href="${new URL("samples/", location.href)}"><picture><source srcset="missing.png 1x, qrcode.png 2x"><img src="also-missing.png"></picture><img data-original="aztec.png" src="placeholder.png">`,
    );
    transfer.setData("text/uri-list", "https://example.invalid/source-page");
    document.querySelector(".artboard")!.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    );
    transfer.clearData();
  });
  await expect(page.locator(".filmstrip-item")).toHaveCount(2);
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("hello-world");
  await page
    .getByRole("button", { name: /aztec.png/, exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("你 😀");
  await expect(page.locator(".canvas-meta")).not.toHaveClass(/has-error/);
});

test("fresh blob URLs, data URLs and inline SVG work through drop and paste", async ({
  page,
}) => {
  await page.goto("./");
  const bytes = Array.from(await readFile("public/samples/qrcode.png"));
  await page.evaluate((bytes) => {
    const transfer = new DataTransfer();
    // A different blob from the preview, with no MIME type supplied by its source.
    const blob = URL.createObjectURL(new Blob([new Uint8Array(bytes)]));
    transfer.setData("text/uri-list", blob);
    document.querySelector(".artboard")!.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    );
    transfer.clearData();
  }, bytes);
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("hello-world");
  const dataUrl = `data:image/webp;base64,${Buffer.from(bytes).toString("base64")}`;
  await page.evaluate((dataUrl) => {
    const transfer = new DataTransfer();
    transfer.setData("text/x-moz-url", `${dataUrl}\nImage title`);
    const event = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: transfer,
    });
    // Firefox ignores clipboardData in a constructed ClipboardEvent.
    if (event.clipboardData !== transfer)
      Object.defineProperty(event, "clipboardData", { value: transfer });
    document.body.dispatchEvent(event);
    transfer.clearData();
  }, dataUrl);
  await expect(page.locator(".filmstrip-item")).toHaveCount(2);
  await page.evaluate((dataUrl) => {
    const transfer = new DataTransfer();
    transfer.setData(
      "text/html",
      `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720"><image href="${dataUrl}" width="720" height="720"/></svg>`,
    );
    document.querySelector(".artboard")!.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    );
    transfer.clearData();
  }, dataUrl);
  await expect(page.locator(".filmstrip-item")).toHaveCount(3);
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("hello-world");
  await expect(page.locator(".canvas-meta")).not.toHaveClass(/has-error/);
});

test("a file and a nested directory in the same drop both import", async ({
  page,
}) => {
  await page.goto("./");
  const qr = Array.from(await readFile("public/samples/qrcode.png"));
  const aztec = Array.from(await readFile("public/samples/aztec.png"));
  await page.evaluate(
    ({ qr, aztec }) => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([new Uint8Array(qr)], "qrcode.png", {
          type: "image/png",
        }),
      );
      transfer.items.add(new File([], "folder"));
      const leaf = {
        isFile: true,
        file: (done: (file: File) => void) =>
          setTimeout(
            () =>
              done(
                new File([new Uint8Array(aztec)], "aztec.png", {
                  type: "image/png",
                }),
              ),
            0,
          ),
      };
      const directory = (entries: object[]) => ({
        isDirectory: true,
        createReader: () => {
          let read = false;
          return {
            readEntries: (done: (entries: object[]) => void) => {
              const batch = read ? [] : entries;
              read = true;
              setTimeout(() => done(batch), 0);
            },
          };
        },
      });
      // DataTransfer.items creates fresh wrappers; model a native directory on its prototype.
      const getEntry = DataTransferItem.prototype.webkitGetAsEntry;
      DataTransferItem.prototype.webkitGetAsEntry = function () {
        return this.getAsFile()?.name === "folder"
          ? (directory([directory([leaf])]) as unknown as FileSystemEntry)
          : getEntry.call(this);
      };
      document.querySelector(".artboard")!.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        }),
      );
      transfer.items.clear();
      DataTransferItem.prototype.webkitGetAsEntry = getEntry;
    },
    { qr, aztec },
  );
  await expect(page.locator(".filmstrip-item")).toHaveCount(2);
  await page
    .getByRole("button", { name: /aztec.png/, exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("textbox", { name: "Decoded text", exact: true }),
  ).toHaveValue("你 😀");
});
