import {
  Button,
  Paper,
  PaperProps,
  Typography,
  type ButtonProps,
} from "@mui/material";
import { DropOptions, useDrop, type DropItem } from "@react-aria/dnd";
import { usePress } from "@react-aria/interactions";
import { useCallback, useRef, useState, type PropsWithChildren } from "react";
import { FileTrigger, type FileTriggerProps } from "react-aria-components";

const acceptedFileTypes = ["image/png", "image/jpeg"];

export interface BarcodeImagesDropZoneProps extends PaperProps {
  onBarcodeImagesDrop?: (files: File[]) => unknown;
  recursive?: boolean;
  buttonLabel?: string;
  dropZoneLabel?: string;
}

async function recursivelyGetFilePromises(
  items: Iterable<DropItem> | AsyncIterable<DropItem>,
) {
  const filePromises: Promise<File>[] = [];
  try {
    for await (const item of items) {
      switch (item.kind) {
        case "text":
          continue;
        case "file":
          acceptedFileTypes.includes(item.type) &&
            filePromises.push(item.getFile());
          break;
        case "directory":
          filePromises.push(
            ...(await recursivelyGetFilePromises(item.getEntries())),
          );
          break;
      }
    }
  } catch {
    /* void */
  }
  return filePromises;
}

async function collectItems(
  items: Iterable<DropItem> | AsyncIterable<DropItem>,
  recursive = true,
): Promise<File[]> {
  const filePromises: Promise<File>[] = [];
  let filePromiseSettledResults: PromiseSettledResult<File>[];
  if (recursive === false) {
    for await (const item of items) {
      if (item.kind === "file" && acceptedFileTypes.includes(item.type)) {
        filePromises.push(item.getFile());
      }
    }
    filePromiseSettledResults = await Promise.allSettled(filePromises);
  }
  filePromiseSettledResults = await Promise.allSettled(
    await recursivelyGetFilePromises(items),
  );
  const files: File[] = [];
  for (const result of filePromiseSettledResults) {
    result.status === "fulfilled" && files.push(result.value);
  }
  return files;
}

const PressableButton = ({
  children,
  ...props
}: PropsWithChildren<ButtonProps>) => {
  const { pressProps } = usePress({});
  return (
    <Button {...props} {...pressProps}>
      {children}
    </Button>
  );
};

const BarcodeImagesDropZone = ({
  onBarcodeImagesDrop,
  recursive,
  buttonLabel,
  dropZoneLabel,
  ...paperProps
}: BarcodeImagesDropZoneProps) => {
  const [isInsideDropZone, setIsInsideDropZone] = useState<boolean>(false);
  const [isCollecting, setIsCollecting] = useState<boolean>(false);

  const handleDropEnter = useCallback<
    Exclude<DropOptions["onDropEnter"], undefined>
  >(() => {
    setIsInsideDropZone(true);
  }, []);

  const handleDropExit = useCallback<
    Exclude<DropOptions["onDropExit"], undefined>
  >(() => {
    setIsInsideDropZone(false);
  }, []);

  const handleDrop = useCallback<Exclude<DropOptions["onDrop"], undefined>>(
    async ({ items }) => {
      setIsCollecting(true);
      try {
        const collectedImageFiles = await collectItems(items, recursive);
        onBarcodeImagesDrop?.(collectedImageFiles);
      } catch {
        onBarcodeImagesDrop;
      }
      setIsCollecting(false);
    },
    [onBarcodeImagesDrop, recursive],
  );

  const handleSelect = useCallback<
    Exclude<FileTriggerProps["onSelect"], undefined>
  >(
    (fileList) => {
      onBarcodeImagesDrop?.([...(fileList ?? [])]);
    },
    [onBarcodeImagesDrop],
  );

  const ref = useRef<HTMLDivElement>(null);

  const { dropProps } = useDrop({
    ref,
    onDrop: handleDrop,
    onDropEnter: handleDropEnter,
    onDropExit: handleDropExit,
  });

  return (
    <Paper
      {...paperProps}
      {...dropProps}
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flexGrow: 1,
        ...paperProps.sx,
      }}
      elevation={isInsideDropZone || isCollecting ? 24 : undefined}
      ref={ref}
    >
      <FileTrigger
        allowsMultiple
        acceptedFileTypes={acceptedFileTypes}
        onSelect={handleSelect}
      >
        <PressableButton
          disabled={isInsideDropZone || isCollecting}
          variant="contained"
          size="large"
        >
          {buttonLabel ?? "Select barcode images"}
        </PressableButton>
      </FileTrigger>
      <Typography
        variant="button"
        sx={{
          marginTop: 2,
          userSelect: "none",
        }}
      >
        {dropZoneLabel ?? " Or drop barcode images here"}
      </Typography>
    </Paper>
  );
};

export default BarcodeImagesDropZone;
