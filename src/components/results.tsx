import { Check, ChevronDown, Copy, Download, LoaderCircle } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatToLabel, type ReadResult } from "zxing-wasm";
import {
  downloadBlob,
  hexBytes,
  resultKey,
  resultPreview,
} from "../lib/result-data";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Textarea } from "./ui/textarea";

export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string | (() => string);
  label?: string;
}) {
  const [state, setState] = useState("");
  // biome-ignore lint/correctness/useExhaustiveDependencies: a changed payload resets copy feedback.
  useEffect(() => {
    setState("");
  }, [text]);
  useEffect(() => {
    if (state) {
      const timer = setTimeout(() => setState(""), 1800);
      return () => clearTimeout(timer);
    }
  }, [state]);
  return (
    <Button
      variant="glass"
      title={state || label}
      aria-label={state || label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(
            typeof text === "function" ? text() : text,
          );
          setState("Copied");
        } catch {
          setState("Select the text to copy");
        }
      }}
    >
      {state === "Copied" ? <Check /> : <Copy />}
      {state || label}
    </Button>
  );
}
function DiagnosticDetails({ result }: { result: ReadResult }) {
  const json = useMemo(() => resultPreview(result), [result]);
  const hex = useMemo(() => hexBytes(result.bytes, 256), [result.bytes]);
  const fullHex = useCallback(() => hexBytes(result.bytes), [result.bytes]);
  const exporter = useRef<Worker | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => exporter.current?.terminate(), []);
  function exportJSON() {
    if (exporter.current) return;
    setSaving(true);
    setError("");
    const worker = new Worker(
      new URL("../lib/result-export.worker.ts", import.meta.url),
      { type: "module" },
    );
    exporter.current = worker;
    const finish = () => {
      worker.terminate();
      exporter.current = undefined;
      setSaving(false);
    };
    worker.onmessage = ({
      data,
    }: MessageEvent<{ blob?: Blob; error?: string }>) => {
      if (data.blob) downloadBlob(data.blob, `zxing-${result.format}.json`);
      if (data.error) setError(data.error);
      finish();
    };
    worker.onerror = () => {
      setError("Could not export JSON. Try again.");
      finish();
    };
    worker.postMessage(result);
  }
  return (
    <>
      <dl className="diagnostic-flags">
        <div>
          <dt>Valid</dt>
          <dd>{String(result.isValid)}</dd>
        </div>
        <div>
          <dt>Mirrored</dt>
          <dd>{String(result.isMirrored)}</dd>
        </div>
        <div>
          <dt>Inverted</dt>
          <dd>{String(result.isInverted)}</dd>
        </div>
        <div>
          <dt>ECI</dt>
          <dd>{String(result.hasECI)}</dd>
        </div>
      </dl>
      <div className="field">
        <div className="section-heading">
          <label htmlFor="payload-hex">Payload HEX</label>
          <output className="mono">
            {Math.min(result.bytes.length, 256)} / {result.bytes.length} B
          </output>
        </div>
        <Textarea
          id="payload-hex"
          aria-label="Payload HEX"
          className="code-output hex-output"
          readOnly
          value={hex}
        />
        <div className="diagnostic-actions">
          <CopyButton text={fullHex} label="Copy HEX" />
          <Button
            variant="glass"
            size="icon"
            aria-label="Download bytes"
            title="Download bytes"
            onClick={() =>
              downloadBlob(
                new Blob([result.bytes as BlobPart], {
                  type: "application/octet-stream",
                }),
                `zxing-${result.format}.bin`,
              )
            }
          >
            <Download />
          </Button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="result-json">Result JSON</label>
        <Textarea
          id="result-json"
          aria-label="Result JSON"
          className="code-output json-output"
          readOnly
          value={json}
        />
        <div className="diagnostic-actions">
          <CopyButton text={json} label="Copy JSON" />
          <Button
            variant="glass"
            size="icon"
            aria-label="Download full JSON"
            title="Download full JSON"
            disabled={saving}
            aria-busy={saving}
            onClick={exportJSON}
          >
            {saving ? <LoaderCircle className="spin" /> : <Download />}
          </Button>
        </div>
        {error && (
          <p className="error" role="status">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
export const Results = memo(function Results({
  results,
  active,
  onActive,
  busy,
  onClear,
  canClear,
}: {
  results: ReadResult[];
  active: number;
  onActive: (value: number) => void;
  busy: boolean;
  onClear: () => void;
  canClear: boolean;
}) {
  const selected = active >= 0 && active < results.length ? active : 0;
  const result = results[selected];
  const [diagnostics, setDiagnostics] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const diagnosticTrigger = useRef<HTMLButtonElement>(null);
  const toggleDiagnostics = (open: boolean) => {
    setDiagnostics(open);
    if (!open) return;
    requestAnimationFrame(() => {
      const panel = scroll.current;
      const trigger = diagnosticTrigger.current;
      const flags = panel?.querySelector(".diagnostic-flags");
      if (!panel || !trigger || !flags) return;
      const bounds = panel.getBoundingClientRect();
      if (flags.getBoundingClientRect().bottom > bounds.bottom - 16)
        panel.scrollTop +=
          trigger.getBoundingClientRect().top - bounds.top - 16;
    });
  };
  return (
    <section
      className="results-pane bg-card"
      aria-label="Decoded result"
      aria-busy={busy}
    >
      <header className="result-toolbar">
        <h2>Reader results</h2>
        <span className="result-state" role="status">
          {busy ? (
            <>
              <LoaderCircle className="spin" size={14} />
              Reading…
            </>
          ) : result ? (
            `${results.length} ${results.length === 1 ? "symbol" : "symbols"}`
          ) : (
            "No result"
          )}
        </span>
      </header>
      <div ref={scroll} className="results-scroll">
        {results.length > 1 && (
          <fieldset className="result-list" aria-label="Detected symbols">
            {results.map((item, index) => (
              <Button
                key={resultKey(item)}
                variant="ghost"
                className="result-row"
                aria-pressed={index === selected}
                aria-label={`Result ${index + 1}: ${formatToLabel(item.format) ?? item.format}`}
                onClick={() => onActive(index)}
              >
                <span className="result-number mono">{index + 1}</span>
                <span className="result-row-content">
                  <span className="result-format">
                    {formatToLabel(item.format) ?? item.format}
                  </span>
                  <span className="result-preview">
                    {item.text || `${item.bytes.length} B`}
                  </span>
                </span>
              </Button>
            ))}
          </fieldset>
        )}
        <div className="results-payload">
          <div className="section-heading">
            <h3>Decoded text</h3>
            {result && (
              <output className="mono">{result.bytes.length} B</output>
            )}
          </div>
          <Textarea
            aria-label="Decoded text"
            className="payload-output"
            readOnly
            value={result?.text ?? ""}
            placeholder={
              busy ? "Reading image…" : "Open an image or start the camera."
            }
          />
          <div className="actions">
            {result ? (
              <CopyButton text={result.text} />
            ) : (
              <Button variant="glass" disabled>
                <Copy />
                Copy
              </Button>
            )}
            <Button variant="glass" disabled={!canClear} onClick={onClear}>
              Clear
            </Button>
          </div>
        </div>
        {result && (
          <div className="results-details">
            <dl className="result-meta">
              <div>
                <dt>Format</dt>
                <dd>{formatToLabel(result.format) ?? result.format}</dd>
              </div>
              <div>
                <dt>Identifier</dt>
                <dd className="mono">{result.symbologyIdentifier || "—"}</dd>
              </div>
              <div>
                <dt>Content</dt>
                <dd>{result.contentType}</dd>
              </div>
              <div>
                <dt>Rotation</dt>
                <dd className="mono">{result.rotation}°</dd>
              </div>
            </dl>
            {result.error && (
              <p className="error" role="status">
                {result.error}
              </p>
            )}
            <Collapsible open={diagnostics} onOpenChange={toggleDiagnostics}>
              <CollapsibleTrigger
                ref={diagnosticTrigger}
                className="disclosure-trigger"
              >
                Diagnostics
                <ChevronDown size={14} />
              </CollapsibleTrigger>
              <CollapsibleContent className="disclosure-content">
                {diagnostics && <DiagnosticDetails result={result} />}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    </section>
  );
});
