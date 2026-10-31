/// <reference lib="webworker" />
import type { ReadResult } from "zxing-wasm";

self.onmessage = ({ data }: MessageEvent<ReadResult>) => {
  try {
    const json = JSON.stringify(
      data,
      (_, value) =>
        ArrayBuffer.isView(value) ? Array.from(value as Uint8Array) : value,
      2,
    );
    self.postMessage({ blob: new Blob([json], { type: "application/json" }) });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
