export type FileSource = "upload" | "folder" | "drop" | "paste" | "url";

interface LegacyDirectoryReader {
  readEntries: (
    success: (entries: LegacyFileEntry[]) => void,
    failure?: (error: DOMException) => void,
  ) => void;
}

interface LegacyFileEntry extends FileSystemEntry {
  file?: (
    success: (file: File) => void,
    failure?: (error: DOMException) => void,
  ) => void;
  createReader?: () => LegacyDirectoryReader;
}

type EntryDataTransferItem = DataTransferItem & {
  webkitGetAsEntry?: () => FileSystemEntry | null;
};

export function createItemId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readEntries(
  reader: LegacyDirectoryReader,
): Promise<LegacyFileEntry[]> {
  const entries: LegacyFileEntry[] = [];
  while (true) {
    const batch = await new Promise<LegacyFileEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (batch.length === 0) {
      return entries;
    }
    entries.push(...batch);
  }
}

async function filesFromEntry(entry: LegacyFileEntry): Promise<File[]> {
  if (entry.isFile && entry.file) {
    return new Promise<File[]>((resolve, reject) => {
      entry.file?.((file) => resolve([file]), reject);
    });
  }
  if (entry.isDirectory && entry.createReader) {
    const entries = await readEntries(entry.createReader());
    return (await Promise.all(entries.map(filesFromEntry))).flat();
  }
  return [];
}

export function isImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|pgm|svg|avif)$/i.test(file.name)
  );
}

export async function filesFromTransfer(data: DataTransfer): Promise<File[]> {
  // Capture every item before yielding: drag data is readable only during drop/paste.
  // Inspect entries per item so an ordinary file cannot hide a sibling directory.
  const roots = [...data.items].flatMap((item) => {
    if (item.kind !== "file") return [];
    const entry = (item as EntryDataTransferItem).webkitGetAsEntry?.();
    if (entry?.isDirectory) return [filesFromEntry(entry as LegacyFileEntry)];
    const file = item.getAsFile?.();
    if (file) return [Promise.resolve([file])];
    return entry ? [filesFromEntry(entry as LegacyFileEntry)] : [];
  });
  const fallback = [...data.files];
  if (!roots.length) return fallback;
  const results = await Promise.allSettled(roots);
  const files = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  if (!files.length) {
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  }
  return files;
}

function supportedImageUrl(
  value: string | null | undefined,
  base = window.location.href,
): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim(), base);
    return ["data:", "blob:", "http:", "https:"].includes(url.protocol)
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function urlsFromUriList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(https?:|blob:|data:image\/)/i.test(line));
}

function srcsetUrls(value: string): string[] {
  const urls: string[] = [];
  let rest = value.trim();
  while (rest) {
    rest = rest.replace(/^[\s,]+/, "");
    const match = /^\S+/.exec(rest);
    if (!match) break;
    const token = match[0];
    urls.push(token.replace(/,+$/, ""));
    rest = rest.slice(token.length);
    if (!token.endsWith(",")) {
      const comma = rest.indexOf(",");
      rest = comma < 0 ? "" : rest.slice(comma + 1);
    }
  }
  return urls;
}

function nestedImageUrls(value: string, base?: string): string[] {
  const url = supportedImageUrl(value, base);
  if (!url) return [];
  const parsed = new URL(url);
  const nested = ["imgurl", "mediaurl", "image_url", "image", "src"]
    .map((parameter) => parsed.searchParams.get(parameter))
    .flatMap((candidate) =>
      candidate ? [supportedImageUrl(candidate, url)] : [],
    )
    .filter((candidate): candidate is string => candidate !== undefined);
  return [...nested, url];
}

/** One group per image, with alternate representations as fallbacks. Read synchronously. */
export function imageUrlGroupsFromTransfer(data: DataTransfer): string[][] {
  const html = new DOMParser().parseFromString(
    data.getData("text/html"),
    "text/html",
  );
  const base =
    supportedImageUrl(html.querySelector("base[href]")?.getAttribute("href")) ??
    window.location.href;
  const urls = [
    ...new Set([
      ...urlsFromUriList(data.getData("text/x-moz-url-data")),
      ...urlsFromUriList(data.getData("text/x-moz-url")),
      ...urlsFromUriList(data.getData("text/uri-list")),
      ...urlsFromUriList(data.getData("text/plain")),
    ]),
  ];
  const groups = [...html.querySelectorAll("img")].map((image) =>
    [
      ...["data-original", "data-src", "data-lazy-src"].flatMap(
        (attribute) => image.getAttribute(attribute) ?? [],
      ),
      ...srcsetUrls(
        image.getAttribute("data-srcset") ?? image.getAttribute("srcset") ?? "",
      ),
      ...[
        ...(image.closest("picture")?.querySelectorAll("source[srcset]") ?? []),
      ].flatMap((source) => srcsetUrls(source.getAttribute("srcset") ?? "")),
      image.getAttribute("src") ?? "",
    ].flatMap((value) => nestedImageUrls(value, base)),
  );
  for (const svg of html.querySelectorAll("svg")) {
    if (!svg.parentElement?.closest("svg"))
      groups.push([
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`,
      ]);
  }
  if (!groups.length) groups.push(...urls.map((url) => nestedImageUrls(url)));
  else if (groups.length === 1)
    groups[0].push(...urls.flatMap((url) => nestedImageUrls(url)));
  const seen = new Set<string>();
  return groups
    .map((group) => [...new Set(group)])
    .filter((group) => {
      if (!group.length || seen.has(group[0])) return false;
      seen.add(group[0]);
      return true;
    });
}

export function imageUrlsFromTransfer(data: DataTransfer): string[] {
  return [...new Set(imageUrlGroupsFromTransfer(data).flat())];
}

export async function fileFromUrl(
  value: string,
  signal?: AbortSignal,
): Promise<File> {
  const url = new URL(value);
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}`);
  }
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) {
    try {
      const image = await createImageBitmap(blob);
      image.close();
    } catch {
      throw new Error("The URL did not return a readable image");
    }
  }
  const filename = ["data:", "blob:"].includes(url.protocol)
    ? "dropped-image"
    : decodeURIComponent(url.pathname.split("/").at(-1) || "remote-image");
  return new File([blob], filename, {
    type: blob.type.startsWith("image/") ? blob.type : "image/unknown",
  });
}

export async function firstImageFileFromUrls(values: string[]): Promise<File> {
  let failure: unknown;
  for (const value of values) {
    try {
      return await fileFromUrl(value);
    } catch (error) {
      failure ??= error;
    }
  }
  throw failure ?? new Error("No readable image was found in the drop.");
}
