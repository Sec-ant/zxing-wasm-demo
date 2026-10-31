import type {
  ReaderOptions,
  ReadResult,
  WriteResult,
  WriterOptions,
} from "zxing-wasm";
import { svgBitmap } from "./svg-bitmap";

export interface DecodedImage {
  results: ReadResult[];
  /** Time spent in the public readBarcodes API, excluding image preparation. */
  duration: number;
  width: number;
  height: number;
}
export type CameraFrame = VideoFrame | ImageBitmap | ImageData;
export type CodecRequest =
  | {
      kind: "read";
      file: Blob;
      image?: ImageBitmap;
      key?: string;
      options: ReaderOptions;
    }
  | { kind: "frame"; image: CameraFrame; options: ReaderOptions }
  | { kind: "write"; text: string; options: WriterOptions };
export type CodecValue = DecodedImage | WriteResult;

export class Codec {
  private workers = new Map<"read" | "write", Worker>();
  private sequence = 0;
  private generation = 0;
  private pending = new Map<
    number,
    { resolve: (value: CodecValue) => void; reject: (error: Error) => void }
  >();

  async run<T extends CodecValue>(input: CodecRequest): Promise<T> {
    let request = input;
    if (
      request.kind === "read" &&
      (request.file.type.startsWith("image/svg+xml") ||
        (request.file instanceof File && /\.svg$/i.test(request.file.name)))
    ) {
      const generation = this.generation;
      const image = await svgBitmap(request.file);
      if (generation !== this.generation) {
        image.close();
        throw new Error("Operation cancelled");
      }
      request = { ...request, image };
    }
    const kind = request.kind === "write" ? "write" : "read";
    let worker = this.workers.get(kind);
    if (!worker) {
      worker =
        kind === "write"
          ? new Worker(new URL("./writer.worker.ts", import.meta.url), {
              type: "module",
            })
          : new Worker(new URL("./codec.worker.ts", import.meta.url), {
              type: "module",
            });
      this.workers.set(kind, worker);
      worker.onmessage = ({
        data,
      }: MessageEvent<{ id: number; value?: CodecValue; error?: string }>) => {
        const pending = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) pending?.reject(new Error(data.error));
        else if (data.value) pending?.resolve(data.value);
      };
      worker.onerror = () =>
        this.dispose(
          "The barcode worker stopped. Try again or reload this page.",
        );
    }
    const id = ++this.sequence;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (value) => resolve(value as T), reject });
      try {
        const transfer: Transferable[] =
          request.kind === "write" || !request.image
            ? []
            : "data" in request.image
              ? [request.image.data.buffer]
              : [request.image];
        worker.postMessage({ id, ...request }, transfer);
      } catch (error) {
        if (
          request.kind !== "write" &&
          request.image &&
          "close" in request.image
        )
          request.image.close();
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  dispose(message = "Operation cancelled") {
    this.generation++;
    for (const worker of this.workers.values()) worker.terminate();
    this.workers.clear();
    for (const { reject } of this.pending.values()) reject(new Error(message));
    this.pending.clear();
  }
}
