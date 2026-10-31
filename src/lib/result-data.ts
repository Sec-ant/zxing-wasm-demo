import type { ReadResult } from "zxing-wasm";

export function resultKey(result: ReadResult): string {
  const {
    format,
    text,
    position: {
      topLeft: { x, y },
    },
  } = result;
  return `${format}:${x},${y}:${text}`;
}

/** Keep the same payload selected when a camera frame changes result order. */
export function matchingResult(
  results: ReadResult[],
  previous?: ReadResult,
): number {
  if (!previous) return 0;
  let selected = 0;
  let closest = Number.POSITIVE_INFINITY;
  results.forEach((result, index) => {
    if (
      result.format !== previous.format ||
      result.text !== previous.text ||
      result.bytes.length !== previous.bytes.length ||
      !result.bytes.every((byte, offset) => byte === previous.bytes[offset])
    )
      return;
    const distance = Math.hypot(
      result.position.topLeft.x - previous.position.topLeft.x,
      result.position.topLeft.y - previous.position.topLeft.y,
    );
    if (distance < closest) {
      closest = distance;
      selected = index;
    }
  });
  return selected;
}

/** Render only the requested byte prefix. Complete data stays available for export. */
export function hexBytes(bytes: Uint8Array, limit = bytes.byteLength): string {
  return Array.from(bytes.subarray(0, limit), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join(" ");
}
export function resultPreview(result: unknown): string {
  return JSON.stringify(
    result,
    (_, value) => {
      if (ArrayBuffer.isView(value)) {
        const prefix = new Uint8Array(
          value.buffer,
          value.byteOffset,
          Math.min(value.byteLength, 32),
        );
        return {
          type: value.constructor.name,
          byteLength: value.byteLength,
          previewHex: hexBytes(prefix),
          truncated: value.byteLength > 32,
        };
      }
      return typeof value === "string" && value.length > 4096
        ? `${value.slice(0, 4096)}…`
        : value;
    },
    2,
  );
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
