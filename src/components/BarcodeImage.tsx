import { Card } from "@mui/material";
import { yieldOrContinue } from "main-thread-scheduling";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { ReadResult } from "zxing-wasm";

interface BarcodeImageProps {
  src: string;
  detect: (image: Blob) => Promise<ReadResult[]>;
}

const BarcodeImage = memo(({ src, detect }: BarcodeImageProps) => {
  /**
   * Revoke Object URL on Unmount
   */
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const imageCallbackRef = useCallback(
    (imageElement: HTMLImageElement | null) => {
      if (imageElement) {
        imageElementRef.current = imageElement;
      } else if (imageElementRef.current) {
        URL.revokeObjectURL(imageElementRef.current.src);
      }
    },
    [],
  );

  const { ref, inView } = useInView({
    threshold: 0,
  });

  // const debouncedInView = useDebounce(inView);

  const [readResults, setReadResults] = useState<ReadResult[] | null>(null);

  const [stale, setStale] = useState(true);
  useEffect(() => {
    setStale(true);
  }, [src, detect]);

  useEffect(() => {
    if (inView && stale) {
      (async () => {
        await yieldOrContinue("user-visible");
        let resp: Response;
        try {
          resp = await fetch(src);
        } catch {
          return;
        }
        if (!resp.ok) {
          return;
        }
        const image = await resp.blob();
        const results = await detect(image);
        setReadResults(results);
        setStale(false);
      })();
    }
  }, [inView, detect, src, stale]);

  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (
      readResults === null ||
      !canvasElementRef.current ||
      !imageElementRef.current
    ) {
      return;
    }
    const { current: canvasElement } = canvasElementRef;
    const { current: imageElement } = imageElementRef;

    const context = canvasElement.getContext("2d")!;

    context.clearRect(0, 0, canvasElement.width, canvasElement.height);

    const ratio =
      imageElement.width / imageElement.naturalWidth / 2 +
      imageElement.height / imageElement.naturalHeight / 2;

    const bleeding = 4;

    canvasElement.width = imageElement.width + 2 * bleeding;
    canvasElement.height = imageElement.height + 2 * bleeding;

    for (const {
      isValid,
      position: { topLeft, topRight, bottomRight, bottomLeft },
    } of readResults) {
      if (!isValid) {
        continue;
      }
      context.beginPath();
      context.moveTo(
        ratio * topLeft.x + bleeding,
        ratio * topLeft.y + bleeding,
      );
      context.lineTo(
        ratio * topRight.x + bleeding,
        ratio * topRight.y + bleeding,
      );
      context.lineTo(
        ratio * bottomRight.x + bleeding,
        ratio * bottomRight.y + bleeding,
      );
      context.lineTo(
        ratio * bottomLeft.x + bleeding,
        ratio * bottomLeft.y + bleeding,
      );
      context.closePath();
      context.strokeStyle = "#f44336";
      context.lineWidth = 3;
      context.stroke();
    }
  }, [readResults]);

  return (
    <Card
      ref={ref}
      raised
      sx={{
        height: "100%",
        minWidth: "fit-content",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 1,
        marginRight: 1,
        padding: 2,
        contain: "paint",
      }}
    >
      <img
        ref={imageCallbackRef}
        src={src}
        loading="lazy"
        style={{
          maxHeight: "100%",
          maxWidth: 320,
          objectFit: "contain",
        }}
      ></img>
      <canvas
        ref={canvasElementRef}
        style={{
          position: "absolute",
          pointerEvents: "none",
        }}
      ></canvas>
    </Card>
  );
});

export default BarcodeImage;
