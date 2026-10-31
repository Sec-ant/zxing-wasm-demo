import {
  Check as CheckIcon,
  Copy,
  Download,
  LoaderCircle,
  ScanLine,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  CREATABLE_BARCODE_FORMATS,
  formatToLabel,
  type WriteResult,
  type WriterOptions,
} from "zxing-wasm";
import { Codec } from "../lib/codec";
import { message } from "../lib/settings";
import { Check, Disclosure, NumberField, SelectOption } from "./controls";
import { CopyButton } from "./results";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { SelectField } from "./ui/SelectField";
import { Textarea } from "./ui/textarea";

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Encoder({
  payload,
  options,
  onPayload,
  onOptions,
  onRead,
}: {
  payload: string;
  options: Required<WriterOptions>;
  onPayload: (value: string) => void;
  onOptions: (value: Required<WriterOptions>) => void;
  onRead: (file: File) => void;
}) {
  const codec = useRef(new Codec());
  const [result, setResult] = useState<WriteResult>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [committed, setCommitted] = useState(payload);
  const composing = useRef(false);
  useEffect(() => () => codec.current.dispose(), []);
  useEffect(() => {
    if (!composing.current) setCommitted(payload);
  }, [payload]);
  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError("");
    setResult(undefined);
    setCopyStatus("");
    const timer = setTimeout(() => {
      void codec.current
        .run<WriteResult>({ kind: "write", text: committed, options })
        .then((value) => {
          if (!cancelled) setResult(value);
        })
        .catch((error) => {
          if (!cancelled) setError(message(error));
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [committed, options]);
  useEffect(() => {
    const url = result?.image ? URL.createObjectURL(result.image) : "";
    setPreview(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [result]);
  useEffect(() => {
    if (copyStatus) {
      const timer = setTimeout(() => setCopyStatus(""), 2200);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);
  function patch<K extends keyof WriterOptions>(
    key: K,
    value: Required<WriterOptions>[K],
  ) {
    onOptions({ ...options, [key]: value });
  }
  async function copyImage() {
    if (!result?.image) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": result.image }),
      ]);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy unavailable · use Download");
    }
  }
  return (
    <div className="workspace encode-workspace">
      <aside className="inspector glass-panel">
        <div className="inspector-scroll">
          <section className="inspector-section">
            <h2>Content</h2>
            <Textarea
              aria-label="Barcode content"
              className="content-input"
              value={payload}
              maxLength={10000}
              onCompositionStart={() => {
                composing.current = true;
              }}
              onCompositionEnd={(event) => {
                composing.current = false;
                setCommitted(event.currentTarget.value);
              }}
              onChange={(event) => {
                onPayload(event.target.value);
                if (!composing.current) setCommitted(event.target.value);
              }}
            />
            <div className="content-count mono">
              {new TextEncoder().encode(payload).length} B UTF-8
            </div>
          </section>
          <section className="inspector-section settings-section">
            <h2>Writer settings</h2>
            <div className="field">
              <label htmlFor="write-format">Symbol format</label>
              <SelectField
                id="write-format"
                label="Symbol format"
                value={options.format}
                items={CREATABLE_BARCODE_FORMATS.map((value) => ({
                  value,
                  label: formatToLabel(value)!,
                }))}
                onValueChange={(value) =>
                  patch("format", value as Required<WriterOptions>["format"])
                }
              />
            </div>
            <NumberField
              label="Module scale"
              value={options.scale}
              min={1}
              max={20}
              onChange={(value) => patch("scale", value)}
            />
            <SelectOption
              label="Rotation"
              value={String(options.rotate)}
              values={["0", "90", "180", "270"]}
              onChange={(value) => patch("rotate", Number(value))}
            />
            <Check
              label="Quiet zones"
              checked={options.addQuietZones}
              onChange={(value) => patch("addQuietZones", value)}
            />
            <Check
              label="Human-readable text"
              checked={options.addHRT}
              onChange={(value) => patch("addHRT", value)}
            />
            <Check
              label="Invert colors"
              checked={options.invert}
              onChange={(value) => patch("invert", value)}
            />
            <Disclosure title="Format options">
              <label className="field">
                Named options
                <Input
                  aria-label="Named options"
                  value={options.options}
                  maxLength={500}
                  placeholder="ecLevel=H,version=5"
                  onChange={(event) => patch("options", event.target.value)}
                />
              </label>
            </Disclosure>
          </section>
        </div>
      </aside>
      <section className="canvas-pane bg-card" aria-label="Generated barcode">
        <header className="tool-bar">
          <h1>Live preview</h1>
          <div className="tool-actions">
            <span className="preview-state" role="status">
              {busy ? (
                <LoaderCircle
                  className="spin"
                  size={14}
                  aria-label="Updating preview"
                />
              ) : error ? (
                <TriangleAlert size={14} aria-label="Encoding failed" />
              ) : null}
            </span>
            <Button
              disabled={!result?.image || busy}
              onClick={() => void copyImage()}
              title={copyStatus || "Copy image"}
            >
              {copyStatus === "Copied" ? <CheckIcon /> : <Copy />}Copy image
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="glass"
                    size="icon"
                    aria-label="Download barcode"
                    disabled={!result || busy}
                  />
                }
              >
                <Download />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    result?.image &&
                    save(result.image, `zxing-${options.format}.png`)
                  }
                >
                  Download PNG
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    result &&
                    save(
                      new Blob([result.svg], { type: "image/svg+xml" }),
                      `zxing-${options.format}.svg`,
                    )
                  }
                >
                  Download SVG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()}>
                  Print barcode
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="canvas-work-area">
          <div className="artboard">
            {preview ? (
              <img
                className="generated-symbol"
                src={preview}
                alt={`Generated ${formatToLabel(options.format)}`}
              />
            ) : (
              <div className="empty-preview">
                <ScanLine size={40} />
                <span>
                  {busy ? "Building your barcode…" : "Preview unavailable"}
                </span>
                {error && <p className="error">{error}</p>}
              </div>
            )}
          </div>
          {result && (
            <div className="generation-diagnostics">
              <div className="section-heading">
                <h2>Output</h2>
                <Button
                  variant="glass"
                  size="sm"
                  disabled={!result.image}
                  onClick={() => {
                    if (result.image)
                      onRead(
                        new File([result.image], `${options.format}.png`, {
                          type: "image/png",
                        }),
                      );
                  }}
                >
                  <ScanLine />
                  Read this code
                </Button>
              </div>
              <dl className="result-meta">
                <div>
                  <dt>Format</dt>
                  <dd>{formatToLabel(options.format)}</dd>
                </div>
                <div>
                  <dt>Symbol grid</dt>
                  <dd className="mono">
                    {result.symbol.width} × {result.symbol.height}
                  </dd>
                </div>
                <div>
                  <dt>PNG size</dt>
                  <dd className="mono">
                    {((result.image?.size ?? 0) / 1024).toFixed(1)} KB
                  </dd>
                </div>
              </dl>
              <Disclosure title="SVG source">
                <Textarea
                  aria-label="SVG source"
                  className="code-output"
                  readOnly
                  value={result.svg}
                />
                <CopyButton text={result.svg} label="Copy SVG" />
              </Disclosure>
              <Disclosure title="Text representation">
                <Textarea
                  aria-label="Text representation"
                  className="code-output barcode-text"
                  readOnly
                  value={result.utf8}
                />
              </Disclosure>
            </div>
          )}
        </div>
        <div
          className={`canvas-meta ${error ? "has-error" : ""}`}
          role="status"
        >
          <span className="feedback-dot" />
          <span>
            {error ||
              copyStatus ||
              (busy ? "Updating preview…" : formatToLabel(options.format))}
          </span>
        </div>
      </section>
    </div>
  );
}
