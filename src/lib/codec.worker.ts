/// <reference lib="webworker" />
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";
import type { CameraFrame, CodecRequest } from "./codec";

let ready: Promise<unknown> | undefined;
let canvas: OffscreenCanvas | undefined;
let context: OffscreenCanvasRenderingContext2D | null | undefined;
let cached: { key: string; image: ImageData } | undefined;

function pixels(
  source: Exclude<CameraFrame, ImageData>,
  camera: boolean,
): ImageData {
  const width = "displayWidth" in source ? source.displayWidth : source.width;
  const height =
    "displayHeight" in source ? source.displayHeight : source.height;
  if (width * height > 32_000_000)
    throw new Error(
      "This image is too large. Use an image under 32 megapixels.",
    );
  const scale = camera ? Math.min(1, 1280 / Math.max(width, height)) : 1;
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);
  if (!canvas) {
    canvas = new OffscreenCanvas(targetWidth, targetHeight);
    context = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!context)
    throw new Error("Image processing is unavailable in this browser.");
  if (canvas.width !== targetWidth) canvas.width = targetWidth;
  if (canvas.height !== targetHeight) canvas.height = targetHeight;
  if (!camera) {
    context.fillStyle = "white";
    context.fillRect(0, 0, targetWidth, targetHeight);
  }
  context.drawImage(source, 0, 0, targetWidth, targetHeight);
  return context.getImageData(0, 0, targetWidth, targetHeight);
}
async function rasterize(file: Blob): Promise<ImageData | undefined> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return undefined;
  }
  try {
    return pixels(bitmap, false);
  } finally {
    bitmap.close();
  }
}

// Requests are ordered; camera scheduling allows exactly one frame in flight.
let queue = Promise.resolve();
self.onmessage = (
  event: MessageEvent<
    Exclude<CodecRequest, { kind: "write" }> & { id: number }
  >,
) => {
  queue = queue.then(async () => {
    const request = event.data;
    try {
      ready ??= prepareZXingModule({
        fireImmediately: true,
        overrides: {
          locateFile: (path: string) =>
            path.endsWith(".wasm") ? wasmUrl : path,
        },
      }).catch((error) => {
        ready = undefined;
        throw error;
      });
      await ready;
      let image: ImageData | undefined;
      if (request.kind === "frame")
        image =
          "data" in request.image ? request.image : pixels(request.image, true);
      else if (request.key && cached?.key === request.key) image = cached.image;
      else {
        image = request.image
          ? pixels(request.image, false)
          : await rasterize(request.file);
        cached = request.key && image ? { key: request.key, image } : undefined;
      }
      const started = performance.now();
      const results = await readBarcodes(
        image ?? (request as Extract<CodecRequest, { kind: "read" }>).file,
        request.options,
      );
      const duration = performance.now() - started;
      const failure = results.find(
        (result) =>
          !result.isValid &&
          (!result.format || result.format === "None") &&
          result.error,
      );
      if (failure) throw new Error(failure.error);
      const transfer: Transferable[] = [];
      for (const result of results) {
        for (const bytes of [
          result.bytes,
          result.bytesECI,
          result.symbol?.data,
        ]) {
          if (
            bytes?.buffer instanceof ArrayBuffer &&
            !transfer.includes(bytes.buffer)
          )
            transfer.push(bytes.buffer);
        }
      }
      self.postMessage(
        {
          id: request.id,
          value: {
            results,
            duration,
            width: image?.width ?? 0,
            height: image?.height ?? 0,
          },
        },
        transfer,
      );
    } catch (error) {
      self.postMessage({
        id: request.id,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (request.image && "close" in request.image) request.image.close();
    }
  });
};
