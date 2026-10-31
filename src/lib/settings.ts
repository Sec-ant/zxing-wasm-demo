import {
  BARCODE_FORMATS,
  BARCODE_META_FORMATS,
  BINARIZERS,
  CHARACTER_SETS,
  CREATABLE_BARCODE_FORMATS,
  defaultReaderOptions,
  defaultWriterOptions,
  EAN_ADD_ON_SYMBOLS,
  type ReaderOptions,
  TEXT_MODES,
  type WriterOptions,
} from "zxing-wasm";

export type Mode = "decode" | "encode";
export interface Settings {
  mode: Mode;
  input: "image" | "camera";
  reader: Required<ReaderOptions>;
  writer: Required<WriterOptions>;
  payload: string;
}
export const STORAGE_KEY = "zxing-studio-workspace-v1";
export function defaults(): Settings {
  return {
    mode: "decode",
    input: "image",
    reader: { ...defaultReaderOptions, formats: [] },
    writer: { ...defaultWriterOptions, scale: 5 },
    payload: "https://github.com/Sec-ant/zxing-wasm",
  };
}
const ranges: Record<string, [number, number]> = {
  downscaleFactor: [2, 4],
  downscaleThreshold: [0, 65535],
  minLineCount: [1, 255],
  maxNumberOfSymbols: [0, 255],
};
export function validateSettings(value: unknown): Settings {
  const result = defaults();
  if (!value || typeof value !== "object") return result;
  const raw = value as Partial<Settings>;
  if (raw.mode === "encode" || raw.mode === "decode") result.mode = raw.mode;
  if (raw.input === "camera" || raw.input === "image") result.input = raw.input;
  if (typeof raw.payload === "string" && raw.payload.length <= 10000)
    result.payload = raw.payload;
  if (raw.reader && typeof raw.reader === "object") {
    for (const key of Object.keys(result.reader) as (keyof ReaderOptions)[]) {
      const next = raw.reader[key];
      if (typeof result.reader[key] === "boolean" && typeof next === "boolean")
        Object.assign(result.reader, { [key]: next });
      const range = ranges[key];
      if (
        range &&
        typeof next === "number" &&
        Number.isInteger(next) &&
        next >= range[0] &&
        next <= range[1]
      )
        Object.assign(result.reader, { [key]: next });
    }
    const { formats, binarizer, textMode, characterSet, eanAddOnSymbol } =
      raw.reader;
    if (Array.isArray(formats))
      result.reader.formats = formats.filter((format) =>
        [...BARCODE_FORMATS, ...BARCODE_META_FORMATS].includes(
          format as (typeof BARCODE_FORMATS)[number],
        ),
      );
    if (BINARIZERS.includes(binarizer!)) result.reader.binarizer = binarizer!;
    if (TEXT_MODES.includes(textMode!)) result.reader.textMode = textMode!;
    if (CHARACTER_SETS.includes(characterSet!))
      result.reader.characterSet = characterSet!;
    if (EAN_ADD_ON_SYMBOLS.includes(eanAddOnSymbol!))
      result.reader.eanAddOnSymbol = eanAddOnSymbol!;
  }
  if (raw.writer && typeof raw.writer === "object") {
    const writer = raw.writer;
    if (
      CREATABLE_BARCODE_FORMATS.includes(
        writer.format as (typeof CREATABLE_BARCODE_FORMATS)[number],
      )
    )
      result.writer.format = writer.format!;
    for (const key of ["invert", "addHRT", "addQuietZones"] as const)
      if (typeof writer[key] === "boolean") result.writer[key] = writer[key];
    if ([0, 90, 180, 270].includes(writer.rotate!))
      result.writer.rotate = writer.rotate!;
    if (
      Number.isInteger(writer.scale) &&
      writer.scale! >= 1 &&
      writer.scale! <= 20
    )
      result.writer.scale = writer.scale!;
    if (typeof writer.options === "string" && writer.options.length <= 500)
      result.writer.options = writer.options;
  }
  return result;
}
export function loadSettings() {
  try {
    return validateSettings(
      JSON.parse(
        new URL(location.href).searchParams.get("workspace") ??
          localStorage.getItem(STORAGE_KEY) ??
          "null",
      ),
    );
  } catch {
    return defaults();
  }
}
export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* Storage can be unavailable in private windows. */
  }
}
export function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
