/// <reference lib="webworker" />
import { prepareZXingModule, writeBarcode } from "zxing-wasm/writer";
import wasmUrl from "zxing-wasm/writer/zxing_writer.wasm?url";
import type { CodecRequest } from "./codec";

let ready: Promise<unknown> | undefined;
let queue = Promise.resolve();
self.onmessage = (
  event: MessageEvent<
    Extract<CodecRequest, { kind: "write" }> & { id: number }
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
      const value = await writeBarcode(request.text, request.options);
      if (value.error) throw new Error(value.error);
      self.postMessage({ id: request.id, value });
    } catch (error) {
      self.postMessage({
        id: request.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
};
