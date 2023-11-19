import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useTheme,
  type BadgeProps,
} from "@mui/material";
import { DataItemProps, JsonViewer, defineEasyType } from "@textea/json-viewer";
import { yieldOrContinue } from "main-thread-scheduling";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { finite, integer, is, minValue, string, transform } from "valibot";
import { ReadResult } from "zxing-wasm";

interface BarcodeImageProps {
  src: string;
  detect: (image: Blob) => Promise<ReadResult[]>;
}

interface imageDimension {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

interface BadgeInfo {
  content: string;
  color: BadgeProps["color"];
}

const uint8ArrayType = defineEasyType({
  is: (value): value is Uint8Array => {
    if (!(value instanceof Uint8Array)) {
      return false;
    }
    return true;
  },
  type: "uint8array",
  colorKey: "base0D",
  Renderer: ({ value }: DataItemProps<Uint8Array>) => {
    const [showRest, setShowRest] = useState(false);
    const collapseBytesAfterLength = 12;
    const hexBytes = [...value].map((x) => x.toString(16).padStart(2, "0"));
    const hasRest = hexBytes.length > collapseBytesAfterLength;
    const hexString =
      !hasRest || showRest
        ? `<hex>${hexBytes.join(" ")}</hex>`
        : `<hex>${hexBytes
            .slice(0, collapseBytesAfterLength)
            .join(" ")}...</hex>`;
    return (
      <Box
        component="span"
        sx={{
          overflowWrap: "anywhere",
          cursor: hasRest ? "pointer" : "inherit",
        }}
        onClick={() => {
          if (window.getSelection()?.type === "Range") {
            return;
          }
          if (hasRest) {
            setShowRest((value) => !value);
          }
        }}
      >
        &quot;
        {hexString}
        &quot;
      </Box>
    );
  },
});

const clickableSchema = transform(string(), (input) => parseInt(input, 10), [
  integer(),
  finite(),
  minValue(1),
]);

const BarcodeImage = memo(({ src, detect }: BarcodeImageProps) => {
  /**
   * Revoke Object URL on Unmount
   */
  const [imageDimension, setImageDimension] = useState<imageDimension | null>(
    null,
  );
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const imageCallbackRef = useCallback(
    (imageElement: HTMLImageElement | null) => {
      if (imageElement) {
        imageElement.addEventListener("load", () => {
          setImageDimension({
            width: imageElement.width,
            height: imageElement.height,
            naturalWidth: imageElement.naturalWidth,
            naturalHeight: imageElement.naturalHeight,
          });
        });
        imageElementRef.current = imageElement;
      } else if (imageElementRef.current) {
        setImageDimension(null);
        URL.revokeObjectURL(imageElementRef.current.src);
      }
    },
    [],
  );

  /**
   * Intersection Observer Hook
   */
  const { ref, inView } = useInView({
    threshold: 0,
  });

  /**
   * Badge Info
   */
  const [badgeInfo, setBadgeInfo] = useState<BadgeInfo>({
    content: "?",
    color: "primary",
  });

  useEffect(() => {
    setBadgeInfo({
      content: "?",
      color: "primary",
    });
  }, [src, detect]);

  const [readResults, setReadResults] = useState<ReadResult[] | null>(null);

  useEffect(() => {
    if (inView && badgeInfo.content === "?") {
      setBadgeInfo({
        color: "warning",
        content: "...",
      });
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
        const validResults = results.filter((r) => r.isValid);
        setBadgeInfo({
          color:
            validResults.length === 0
              ? "error"
              : validResults.length < results.length
                ? "warning"
                : "success",
          content: `${results?.length}`,
        });
      })();
    }
  }, [badgeInfo.content, detect, inView, src]);

  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (
      readResults === null ||
      !canvasElementRef.current ||
      imageDimension === null
    ) {
      return;
    }
    const { current: canvasElement } = canvasElementRef;

    const context = canvasElement.getContext("2d")!;

    context.clearRect(0, 0, canvasElement.width, canvasElement.height);

    const ratio =
      imageDimension.width / imageDimension.naturalWidth / 2 +
      imageDimension.height / imageDimension.naturalHeight / 2;

    const bleeding = 4;

    canvasElement.width = imageDimension.width + 2 * bleeding;
    canvasElement.height = imageDimension.height + 2 * bleeding;

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
  }, [readResults, imageDimension]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const handleOpenDialog = useCallback(() => {
    if (is(clickableSchema, badgeInfo.content)) {
      setDialogOpen(true);
    }
  }, [badgeInfo.content]);
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const theme = useTheme();

  return (
    <>
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        aria-labelledby="read-results-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="read-results-dialog-title">Read Results</DialogTitle>
        <DialogContent>
          <JsonViewer
            theme={theme.palette.mode}
            value={readResults}
            valueTypes={[uint8ArrayType]}
          ></JsonViewer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
      <Badge
        color={badgeInfo.color}
        variant="standard"
        badgeContent={badgeInfo.content}
        slotProps={{
          badge: {
            onClick: handleOpenDialog,
            style: {
              userSelect: "none",
              cursor: is(clickableSchema, badgeInfo.content)
                ? "pointer"
                : "initial",
            },
          },
        }}
        sx={{
          margin: 1,
        }}
      >
        <Card
          ref={ref}
          raised
          sx={{
            height: "100%",
            minWidth: "fit-content",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 2,
            contain: "paint",
          }}
        >
          <img
            ref={imageCallbackRef}
            src={src}
            loading="lazy"
            style={{
              userSelect: "none",
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
      </Badge>
    </>
  );
});

export default BarcodeImage;
