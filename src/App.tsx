import {
  BookOpen,
  Camera,
  Check,
  CodeXml,
  FileImage,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  Moon,
  RotateCcw,
  ScanLine,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ReaderOptions,
  type ReadResult,
  ZXING_CPP_COMMIT,
  ZXING_WASM_VERSION,
} from "zxing-wasm";
import { CameraReader } from "./components/camera-reader";
import { Choice } from "./components/controls";
import { DecodeWorkspace } from "./components/decode-workspace";
import { Encoder } from "./components/encoder";
import { ImageOverlay } from "./components/image-overlay";
import { ImageUrlInput } from "./components/image-url-input";
import { ReaderOptionsPanel } from "./components/reader-options";
import { Results } from "./components/results";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/ui/alert-dialog";
import { Button } from "./components/ui/button";
import { Codec, type DecodedImage } from "./lib/codec";
import {
  fileFromUrl,
  filesFromTransfer,
  firstImageFileFromUrls,
  imageUrlGroupsFromTransfer,
  imageUrlsFromTransfer,
  isImageFile,
} from "./lib/files";
import { matchingResult } from "./lib/result-data";
import {
  defaults,
  loadSettings,
  type Mode,
  message,
  saveSettings,
} from "./lib/settings";

interface SourceImage {
  id: string;
  file: File;
  url: string;
}
interface ScanWork {
  files: SourceImage[];
  options: Required<ReaderOptions>;
  cancelled: boolean;
}
interface Scan {
  data?: DecodedImage;
  error?: string;
  busy?: boolean;
}
const samples = [
  { name: "QR Code", file: "qrcode.png" },
  { name: "Data Matrix", file: "datamatrix.png" },
  { name: "Aztec", file: "aztec.png" },
  { name: "PDF417", file: "pdf417.png" },
  { name: "Code 128", file: "code128.png" },
  { name: "Multi", file: "multi.png" },
];

export function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [files, setFiles] = useState<SourceImage[]>([]);
  const [selected, setSelected] = useState("");
  const [scans, setScans] = useState<Record<string, Scan>>({});
  const [activeResult, setActiveResult] = useState(0);
  const [cameraResult, setCameraResult] = useState<DecodedImage>();
  const [cameraRevision, setCameraRevision] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [dropping, setDropping] = useState(false);
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  const upload = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);
  const sources = useRef(files);
  const remote = useRef<AbortController | undefined>(undefined);
  const cancelRemote = useCallback(() => remote.current?.abort(), []);
  const preview = useRef<HTMLImageElement>(null);
  const imageCodec = useRef(new Codec());
  const pendingScan = useRef<ScanWork | undefined>(undefined);
  const scanning = useRef(false);
  const cameraSelection = useRef<ReadResult | undefined>(undefined);
  const [failedPreview, setFailedPreview] = useState("");
  sources.current = files;
  const source = files.find((file) => file.id === selected) ?? files[0];
  const scan = source ? scans[source.id] : undefined;
  const data = settings.input === "camera" ? cameraResult : scan?.data;
  const results = data?.results ?? [];
  const selectedResult =
    activeResult >= 0 && activeResult < results.length ? activeResult : 0;
  const receiveCameraResult = useCallback((value: DecodedImage | undefined) => {
    const index = matchingResult(value?.results ?? [], cameraSelection.current);
    cameraSelection.current = value?.results[index];
    setActiveResult(index);
    setCameraResult(value);
    return index;
  }, []);
  const selectResult = (index: number) => {
    setActiveResult(index);
    if (settings.input === "camera") cameraSelection.current = results[index];
  };
  const busy = Object.values(scans).some((scan) => scan.busy);
  const setMode = (mode: Mode) => {
    setCameraResult(undefined);
    setSettings((current) => ({ ...current, mode }));
  };
  const setInput = (input: "image" | "camera") => {
    setActiveResult(0);
    setCameraResult(undefined);
    setSettings((current) => ({ ...current, input }));
  };
  const updateReader = useCallback((reader: Required<ReaderOptions>) => {
    setActiveResult(0);
    setSettings((current) => ({ ...current, reader }));
  }, []);

  useEffect(() => {
    saveSettings(settings);
    const url = new URL(location.href);
    if (url.searchParams.has("workspace")) {
      url.searchParams.set("workspace", JSON.stringify(settings));
      history.replaceState(null, "", url);
    }
  }, [settings]);
  useEffect(
    () => () => {
      for (const source of sources.current) URL.revokeObjectURL(source.url);
      remote.current?.abort();
      imageCodec.current.dispose();
    },
    [],
  );
  useEffect(() => {
    if (shareStatus) {
      const timer = setTimeout(() => setShareStatus(""), 2000);
      return () => clearTimeout(timer);
    }
  }, [shareStatus]);

  const addFiles = useCallback((incoming: File[]) => {
    const images = incoming.filter(isImageFile);
    if (!images.length) {
      setError("Choose an image file, such as PNG, JPEG or WebP.");
      return;
    }
    if (images.some((file) => file.size > 32 * 1024 * 1024)) {
      setError(
        "Each image must be under 32 MB. Choose smaller files and try again.",
      );
      return;
    }
    if (sources.current.length + images.length > 200) {
      setError(
        "Keep up to 200 images in the workspace. Clear some images before adding more.",
      );
      return;
    }
    const added = images.map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }));
    setFiles((current) => [...current, ...added]);
    setSelected(added[0].id);
    setActiveResult(0);
    setError("");
    setSettings((current) => ({ ...current, mode: "decode", input: "image" }));
  }, []);

  const receive = useCallback(
    async (data: DataTransfer) => {
      // Text and entry handles must be captured in the event's synchronous turn.
      const groups = imageUrlGroupsFromTransfer(data);
      const pendingFiles = filesFromTransfer(data);
      setError("");
      try {
        const incoming = (await pendingFiles).filter(isImageFile);
        if (incoming.length) {
          addFiles(incoming);
          return;
        }
        const existing = sources.current.find((source) =>
          groups.some((group) => group.includes(source.url)),
        );
        const unseen = groups.filter(
          (group) =>
            !sources.current.some((source) => group.includes(source.url)),
        );
        if (unseen.length) {
          setFetching(true);
          const resolved = await Promise.allSettled(
            unseen.map(firstImageFileFromUrls),
          );
          const files = resolved.flatMap((result) =>
            result.status === "fulfilled" ? [result.value] : [],
          );
          if (files.length) {
            addFiles(files);
            return;
          }
          if (!existing) {
            const failure = resolved.find(
              (result) => result.status === "rejected",
            );
            throw failure?.status === "rejected"
              ? failure.reason
              : new Error("No readable image was found.");
          }
        }
        if (existing) {
          setSelected(existing.id);
          setSettings((current) => ({
            ...current,
            mode: "decode",
            input: "image",
          }));
        } else setError("Drop an image or a folder of images.");
      } catch (error) {
        setError(
          `${message(error)}. Try a local image if the source blocks access.`,
        );
      } finally {
        setFetching(false);
      }
    },
    [addFiles],
  );

  const drainImages = useCallback(async () => {
    if (scanning.current) return;
    scanning.current = true;
    try {
      while (pendingScan.current) {
        const work = pendingScan.current;
        pendingScan.current = undefined;
        for (const source of work.files) {
          if (work.cancelled) break;
          let scan: Scan;
          try {
            scan = {
              data: await imageCodec.current.run<DecodedImage>({
                kind: "read",
                file: source.file,
                key: source.id,
                options: work.options,
              }),
            };
          } catch (error) {
            scan = { error: message(error) };
          }
          if (work.cancelled) break;
          setScans((current) => ({ ...current, [source.id]: scan }));
        }
      }
    } finally {
      scanning.current = false;
    }
  }, []);

  // Reuse the initialized reader and cached pixels; only the latest requested scan runs next.
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision explicitly requests a fresh scan.
  useEffect(() => {
    if (!files.length) {
      setScans({});
      return;
    }
    if (settings.mode !== "decode" || settings.input !== "image") return;
    const work: ScanWork = {
      files,
      options: settings.reader,
      cancelled: false,
    };
    setScans(Object.fromEntries(files.map(({ id }) => [id, { busy: true }])));
    const timer = setTimeout(() => {
      pendingScan.current = work;
      void drainImages();
    }, 100);
    return () => {
      work.cancelled = true;
      clearTimeout(timer);
      if (pendingScan.current === work) pendingScan.current = undefined;
    };
  }, [
    files,
    settings.reader,
    settings.mode,
    settings.input,
    revision,
    drainImages,
  ]);

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (!event.clipboardData) return;
      const files = [...event.clipboardData.files];
      if (files.some(isImageFile)) {
        event.preventDefault();
        void receive(event.clipboardData);
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest("input,textarea,[contenteditable=true]")) return;
      const urls = imageUrlsFromTransfer(event.clipboardData);
      if (urls.length) {
        event.preventDefault();
        void receive(event.clipboardData);
      }
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [receive]);

  function clearFiles() {
    imageCodec.current.dispose();
    for (const source of files) URL.revokeObjectURL(source.url);
    setFiles([]);
    setSelected("");
    setScans({});
    setError("");
    setActiveResult(0);
  }
  function removeFile(id: string) {
    const removed = files.find((source) => source.id === id);
    if (removed) URL.revokeObjectURL(removed.url);
    setFiles((current) => current.filter((source) => source.id !== id));
    setActiveResult(0);
  }
  async function fetchImage(value: string) {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol))
      throw new Error("Use an HTTP or HTTPS image URL.");
    remote.current?.abort();
    const controller = new AbortController();
    remote.current = controller;
    setFetching(true);
    setError("");
    try {
      addFiles([await fileFromUrl(value, controller.signal)]);
    } catch (error) {
      if (!controller.signal.aborted)
        throw new Error(
          `${message(error)}. Download the image and upload it if the host blocks CORS.`,
        );
    } finally {
      if (remote.current === controller) setFetching(false);
    }
  }
  async function loadSample(file: string) {
    setFetching(true);
    setError("");
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}samples/${file}`,
      );
      if (!response.ok)
        throw new Error("Sample unavailable. Try uploading your own image.");
      addFiles([
        new File([await response.blob()], file, {
          type: response.headers.get("content-type") ?? "image/png",
        }),
      ]);
    } catch (error) {
      setError(message(error));
    } finally {
      setFetching(false);
    }
  }
  async function share() {
    const url = new URL(location.href);
    url.searchParams.set("workspace", JSON.stringify(settings));
    try {
      await navigator.clipboard.writeText(url.href);
      setShareStatus("Link copied");
    } catch {
      setShareStatus("Could not copy link");
    }
  }
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next ? "#100f0f" : "#fffcf0");
    try {
      localStorage.setItem("zxing-studio-theme", next ? "dark" : "light");
    } catch {
      /* Theme still works without storage. */
    }
  }
  const inputChoices = (
    <Choice
      label="Reader input"
      value={settings.input}
      choices={[
        {
          value: "image",
          label: (
            <>
              <ImageIcon />
              Image
            </>
          ),
        },
        {
          value: "camera",
          label: (
            <>
              <Camera />
              Camera
            </>
          ),
        },
      ]}
      onChange={(value) => setInput(value as "image" | "camera")}
    />
  );
  const selectedBusy = Boolean(scan?.busy);
  const sourceError = error || (settings.input === "image" ? scan?.error : "");

  return (
    <div className="shell">
      <a className="skip" href="#workspace">
        Skip to workspace
      </a>
      <header className="topbar">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="ZXing WASM Studio home"
        >
          <span className="brand-mark">
            <ScanLine size={22} />
          </span>
          <span>
            zxing<span className="brand-suffix"> / wasm</span>
          </span>
        </a>
        <nav aria-label="Workspace">
          <Choice
            label="Workspace"
            value={settings.mode}
            choices={[
              {
                value: "decode",
                label: (
                  <>
                    <ScanLine />
                    Reader
                  </>
                ),
              },
              {
                value: "encode",
                label: (
                  <>
                    <CodeXml />
                    Writer
                  </>
                ),
              },
            ]}
            onChange={(value) => setMode(value as Mode)}
          />
        </nav>
        <div className="header-tools">
          <Button
            variant="ghost"
            size="icon"
            aria-label={shareStatus || "Copy share link"}
            title={shareStatus || "Copy share link"}
            onClick={() => void share()}
          >
            {shareStatus === "Link copied" ? <Check /> : <Link2 />}
          </Button>
          <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Reset workspace"
                  title="Reset workspace"
                />
              }
            >
              <RotateCcw />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset workspace?</AlertDialogTitle>
                <AlertDialogDescription>
                  Clear imported images, content and settings saved in this
                  browser. Your theme preference is kept.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    clearFiles();
                    setCameraResult(undefined);
                    setSettings(defaults());
                    setResetOpen(false);
                  }}
                >
                  Reset workspace
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="ghost"
            size="icon"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            title={dark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={toggleTheme}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
          <a
            className="docs-link"
            href="https://sec-ant.github.io/zxing-wasm/docs/"
            target="_blank"
            rel="noreferrer"
            aria-label="Open API documentation"
            title="API documentation"
          >
            <BookOpen size={16} />
          </a>
        </div>
      </header>
      <main id="workspace">
        {settings.mode === "encode" ? (
          <Encoder
            payload={settings.payload}
            options={settings.writer}
            onPayload={(payload) =>
              setSettings((current) => ({ ...current, payload }))
            }
            onOptions={(writer) =>
              setSettings((current) => ({ ...current, writer }))
            }
            onRead={(file) => addFiles([file])}
          />
        ) : (
          <DecodeWorkspace>
            <aside
              key="settings"
              className="inspector glass-panel"
              aria-label="Reader controls"
            >
              <div className="inspector-scroll">
                <ReaderOptionsPanel
                  options={settings.reader}
                  onChange={updateReader}
                />
              </div>
            </aside>
            <section
              key="source"
              className="canvas-pane bg-card"
              aria-label="Reader preview"
            >
              {settings.input === "camera" ? (
                <CameraReader
                  key={cameraRevision}
                  options={settings.reader}
                  active={selectedResult}
                  onResult={receiveCameraResult}
                >
                  {inputChoices}
                </CameraReader>
              ) : (
                <>
                  <header className="tool-bar reader-image-toolbar">
                    {inputChoices}
                    <div className="tool-actions">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Rescan images"
                        title="Rescan images"
                        className="reader-image-rescan"
                        disabled={!source || busy}
                        onClick={() => setRevision((value) => value + 1)}
                      >
                        <RotateCcw />
                      </Button>
                      <div className="image-import-actions">
                        <ImageUrlInput
                          value={url}
                          onChange={setUrl}
                          onSubmit={fetchImage}
                          onCancel={cancelRemote}
                          busy={fetching}
                        />
                        <Button
                          variant="glass"
                          size="icon"
                          aria-label="Choose folder"
                          title="Choose folder"
                          onClick={() => folder.current?.click()}
                        >
                          <FolderOpen />
                        </Button>
                        <Button onClick={() => upload.current?.click()}>
                          <Upload />
                          <span className="input-label-full">
                            Upload images
                          </span>
                          <span className="input-label-compact">
                            Upload<span className="sr-only"> images</span>
                          </span>
                        </Button>
                      </div>
                    </div>
                  </header>
                  <section
                    aria-label="Image drop target"
                    className={`artboard ${dropping ? "dropping" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDropping(true);
                    }}
                    onDragLeave={(event) => {
                      if (
                        !event.currentTarget.contains(
                          event.relatedTarget as Node,
                        )
                      )
                        setDropping(false);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDropping(false);
                      void receive(event.dataTransfer);
                    }}
                  >
                    {source && failedPreview !== source.id ? (
                      <figure className="image-preview">
                        <div className="image-frame">
                          <img
                            ref={preview}
                            src={source.url}
                            alt={source.file.name}
                            onDragStart={(event) => {
                              // Keep the actual image transferable in browsers with sparse defaults.
                              event.dataTransfer.setData(
                                "text/uri-list",
                                source.url,
                              );
                              event.dataTransfer.setData(
                                "text/html",
                                event.currentTarget.outerHTML,
                              );
                              event.dataTransfer.setData(
                                "text/plain",
                                source.url,
                              );
                            }}
                            onError={() => setFailedPreview(source.id)}
                          />
                          <ImageOverlay
                            results={results}
                            width={data?.width ?? 0}
                            height={data?.height ?? 0}
                            active={selectedResult}
                          />
                        </div>
                      </figure>
                    ) : (
                      <div className="empty-area">
                        <button
                          type="button"
                          className="empty-canvas"
                          onClick={() => upload.current?.click()}
                        >
                          <ImageIcon size={36} />
                          <span>
                            {source
                              ? "Image preview unavailable"
                              : "Upload an image"}
                          </span>
                        </button>
                        {!source && (
                          <div className="sample-picker">
                            <span className="note">Samples</span>
                            <div className="sample-options">
                              {samples.map((sample) => (
                                <button
                                  type="button"
                                  key={sample.file}
                                  disabled={fetching}
                                  onClick={() => void loadSample(sample.file)}
                                >
                                  <img
                                    src={`${import.meta.env.BASE_URL}samples/${sample.file}`}
                                    alt=""
                                  />
                                  <span>{sample.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {(selectedBusy || fetching) && (
                      <div className="processing" role="status">
                        <LoaderCircle className="spin" size={15} />
                        {fetching ? "Opening image…" : "Reading image…"}
                      </div>
                    )}
                    {dropping && (
                      <div className="drop-message">Drop images to read</div>
                    )}
                  </section>
                  {files.length > 0 && (
                    <fieldset
                      className="filmstrip"
                      aria-label="Imported images"
                    >
                      {files.map((file) => (
                        <div
                          className={`filmstrip-item ${file.id === source?.id ? "is-selected" : ""}`}
                          key={file.id}
                        >
                          <button
                            type="button"
                            className="file-select"
                            onClick={() => {
                              setSelected(file.id);
                              setActiveResult(0);
                            }}
                            aria-pressed={file.id === source?.id}
                            title={file.file.name}
                          >
                            <FileImage size={15} />
                            <span>{file.file.name}</span>
                            <small>
                              {scans[file.id]?.busy
                                ? "…"
                                : scans[file.id]?.error
                                  ? "Error"
                                  : (scans[file.id]?.data?.results.length ?? 0)}
                            </small>
                          </button>
                          <button
                            type="button"
                            className="remove-file"
                            aria-label={`Remove ${file.file.name}`}
                            onClick={() => removeFile(file.id)}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </fieldset>
                  )}
                  <div
                    className={`canvas-meta ${sourceError ? "has-error" : ""}`}
                    role="status"
                  >
                    <span className="feedback-dot" />
                    <span
                      className="source-name"
                      title={sourceError || source?.file.name}
                    >
                      {sourceError ||
                        (selectedBusy
                          ? "Reading image…"
                          : source
                            ? `${source.file.name} · ${results.length} ${results.length === 1 ? "symbol" : "symbols"} detected`
                            : "No image selected")}
                    </span>
                    {data && (
                      <span className="mono dimensions">
                        {data.width > 0 && `${data.width} × ${data.height} · `}
                        {data.duration.toFixed(1)} ms
                      </span>
                    )}
                    {error && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Dismiss error"
                        onClick={() => setError("")}
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </section>
            <Results
              key="results"
              results={results}
              active={selectedResult}
              onActive={selectResult}
              busy={settings.input === "image" && selectedBusy}
              onClear={() => {
                if (settings.input === "camera") {
                  setCameraResult(undefined);
                  setCameraRevision((value) => value + 1);
                } else clearFiles();
              }}
              canClear={
                settings.input === "camera"
                  ? Boolean(cameraResult)
                  : files.length > 0
              }
            />
          </DecodeWorkspace>
        )}
      </main>
      <footer className="app-footer">
        <span className="mono">
          wasm {ZXING_WASM_VERSION} <span className="footer-separator">/</span>{" "}
          cpp {ZXING_CPP_COMMIT.slice(0, 8)}
        </span>
      </footer>
      <input
        ref={upload}
        id="image-upload"
        className="sr-only"
        type="file"
        accept="image/*,.pgm"
        multiple
        aria-label="Upload images"
        onChange={(event) => {
          addFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
      <input
        ref={(node) => {
          folder.current = node;
          node?.setAttribute("webkitdirectory", "");
        }}
        className="sr-only"
        type="file"
        multiple
        aria-label="Upload folder"
        onChange={(event) => {
          addFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
