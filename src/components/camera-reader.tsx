import { Camera, LoaderCircle, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReaderOptions } from "zxing-wasm";
import { Codec, type DecodedImage } from "../lib/codec";
import { message } from "../lib/settings";
import { captureVideo, nextVideoFrame } from "../lib/video-frames";
import { observeLiveOverlay, updateLiveOverlay } from "./image-overlay";
import { Button } from "./ui/button";

function contentKey(value: DecodedImage) {
  return value.results
    .map(
      ({
        format,
        text,
        bytes,
        error,
        isValid,
        isInverted,
        isMirrored,
        rotation,
      }) =>
        `${format}|${text}|${bytes.join(",")}|${error}|${isValid}|${isInverted}|${isMirrored}|${rotation}`,
    )
    .join("\n");
}
function geometryKey(value: DecodedImage) {
  return value.results
    .map(({ position: p }) =>
      [p.topLeft, p.topRight, p.bottomRight, p.bottomLeft]
        .map(({ x, y }) => `${x},${y}`)
        .join(";"),
    )
    .join("|");
}
export function CameraReader({
  options,
  active,
  onResult,
  children,
}: {
  options: ReaderOptions;
  active: number;
  onResult: (value: DecodedImage | undefined) => number;
  children: React.ReactNode;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const outline = useRef<SVGSVGElement>(null);
  const summary = useRef<HTMLSpanElement>(null);
  const timings = useRef<HTMLSpanElement>(null);
  const operation = useRef(0);
  const stream = useRef<MediaStream | undefined>(undefined);
  const codec = useRef(new Codec());
  const cancelFrame = useRef<(() => void) | undefined>(undefined);
  const current = useRef({ options, active, onResult });
  current.current = { options, active, onResult };
  const latest = useRef<DecodedImage | undefined>(undefined);
  useEffect(
    () => (outline.current ? observeLiveOverlay(outline.current) : undefined),
    [],
  );
  useEffect(() => {
    const value = latest.current;
    if (outline.current && value)
      updateLiveOverlay(
        outline.current,
        value.results,
        value.width,
        value.height,
        active,
      );
  }, [active]);
  const [status, setStatus] = useState<"idle" | "starting" | "running">("idle");
  const [error, setError] = useState("");
  const stop = useCallback(() => {
    operation.current++;
    cancelFrame.current?.();
    cancelFrame.current = undefined;
    stream.current?.getTracks().forEach((track) => {
      track.stop();
    });
    stream.current = undefined;
    codec.current.dispose();
    if (video.current) video.current.srcObject = null;
    outline.current?.replaceChildren();
    latest.current = undefined;
    setStatus("idle");
    if (timings.current) timings.current.textContent = "";
  }, []);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      stop();
    };
  }, [stop]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: changing filters invalidates the displayed detection without restarting the camera.
  useEffect(() => {
    outline.current?.replaceChildren();
    latest.current = undefined;
    current.current.onResult(undefined);
    if (summary.current) summary.current.textContent = "Scanning…";
  }, [options]);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera access needs HTTPS or localhost and a browser with camera support.",
      );
      return;
    }
    stop();
    const revision = ++operation.current;
    setStatus("starting");
    setError("");
    current.current.onResult(undefined);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      });
      if (revision !== operation.current) {
        media.getTracks().forEach((track) => {
          track.stop();
        });
        return;
      }
      stream.current = media;
      const element = video.current!;
      element.srcObject = media;
      await element.play();
      if (revision !== operation.current) return;
      setStatus("running");
      const fallback = document.createElement("canvas");
      let lastFrameTime = -1;
      let lastContent = "";
      let lastGeometry = "";
      let lastPublished = 0;
      let lastStats = 0;
      let completed = 0;
      let statsStart = performance.now();
      let warmed = false;
      let publishedOptions: ReaderOptions | undefined;
      let inFlight = false;
      const schedule = () => {
        if (revision !== operation.current) return;
        cancelFrame.current = nextVideoFrame(element, () => {
          schedule();
          if (!inFlight) {
            inFlight = true;
            void frame().finally(() => {
              inFlight = false;
            });
          }
        });
      };
      const frame = async () => {
        if (revision !== operation.current) return;
        // requestAnimationFrame fallback must not decode the same video frame twice.
        if (
          element.readyState < 2 ||
          !element.videoWidth ||
          element.currentTime === lastFrameTime
        ) {
          return;
        }
        lastFrameTime = element.currentTime;
        const started = performance.now();
        const frameOptions = current.current.options;
        try {
          const image = await captureVideo(element, fallback);
          if (revision !== operation.current) {
            if ("close" in image) image.close();
            return;
          }
          const decoded = await codec.current.run<DecodedImage>({
            kind: "frame",
            image,
            options: frameOptions,
          });
          if (revision !== operation.current) return;
          const now = performance.now();
          completed++;
          if (frameOptions === current.current.options) {
            latest.current = decoded;
            let selected = current.current.active;
            const nextContent = contentKey(decoded);
            const nextGeometry = geometryKey(decoded);
            // Geometry paints every completed frame; result text/diagnostics are independent.
            if (
              frameOptions !== publishedOptions ||
              nextContent !== lastContent ||
              (nextGeometry !== lastGeometry && now - lastPublished >= 250)
            ) {
              publishedOptions = frameOptions;
              lastContent = nextContent;
              lastGeometry = nextGeometry;
              lastPublished = now;
              selected = current.current.onResult(decoded);
            }
            current.current.active = selected;
            if (outline.current)
              updateLiveOverlay(
                outline.current,
                decoded.results,
                decoded.width,
                decoded.height,
                selected,
              );
            if (now - lastStats >= 250) {
              lastStats = now;
              const hz = (completed * 1000) / (now - statsStart);
              if (summary.current)
                summary.current.textContent = `${decoded.results.length} ${decoded.results.length === 1 ? "symbol" : "symbols"} · scanning`;
              if (timings.current)
                timings.current.textContent = `Read ${decoded.duration.toFixed(1)} ms · Frame ${(now - started).toFixed(1)} ms · ${hz.toFixed(1)} Hz`;
            }
            // Drop startup cost from the ongoing throughput display.
            if (!warmed) {
              warmed = true;
              statsStart = now;
              completed = 0;
            }
          }
        } catch (error) {
          if (revision === operation.current) {
            setError(message(error));
            stop();
          }
        }
      };
      schedule();
    } catch (error) {
      if (revision !== operation.current) return;
      stop();
      setError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser and try again."
          : message(error),
      );
    }
  }
  return (
    <>
      <header className="tool-bar">
        {children}
        <Button
          variant={status === "idle" ? "default" : "glass"}
          onClick={() => (status === "idle" ? void start() : stop())}
          aria-busy={status === "starting"}
        >
          {status === "starting" ? (
            <LoaderCircle className="spin" />
          ) : status === "running" ? (
            <Square />
          ) : (
            <Camera />
          )}
          {status === "idle" ? "Start camera" : "Stop camera"}
        </Button>
      </header>
      <div className="artboard camera-artboard">
        <div className="camera-stage">
          <video
            ref={video}
            muted
            playsInline
            aria-label="Live camera preview"
          />
          <svg ref={outline} className="image-overlay" aria-hidden="true" />
          {status === "idle" && (
            <div className="camera-idle">
              <Camera size={36} />
              <span>Read from your camera</span>
            </div>
          )}
        </div>
      </div>
      <div className={`canvas-meta camera-meta ${error ? "has-error" : ""}`}>
        <span className="feedback-dot" />
        <span role="status" className="camera-status">
          {error ||
            (status === "starting" ? (
              "Waiting for camera permission…"
            ) : status === "idle" ? (
              "Camera stopped"
            ) : (
              <span ref={summary}>Scanning…</span>
            ))}
        </span>
        <span
          ref={timings}
          role="status"
          aria-live="off"
          className="mono camera-timings"
          title="Read: public readBarcodes call. Frame: capture, preparation, transfer and decoding. Hz: completed frames per second."
          aria-label="Camera performance"
        />
      </div>
    </>
  );
}
