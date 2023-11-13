import {
  Button,
  ButtonProps,
  Paper,
  PaperProps,
  Typography,
} from "@mui/material";
import { usePress } from "@react-aria/interactions";
import { useCallback, useState, type PropsWithChildren } from "react";
import {
  DropItem,
  // Button as ReactAriaButton,
  DropZone,
  DropZoneProps,
  FileTrigger,
  FileTriggerProps,
} from "react-aria-components";

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
    Exclude<DropZoneProps["onDropEnter"], undefined>
  >(() => {
    setIsInsideDropZone(true);
  }, []);

  const handleDropExit = useCallback<
    Exclude<DropZoneProps["onDropExit"], undefined>
  >(() => {
    setIsInsideDropZone(false);
  }, []);

  const handleDrop = useCallback<Exclude<DropZoneProps["onDrop"], undefined>>(
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

  return (
    <DropZone
      onDrop={handleDrop}
      onDropEnter={handleDropEnter}
      onDropExit={handleDropExit}
      style={{ flexGrow: 1 }}
    >
      <Paper
        {...paperProps}
        sx={{
          p: 2,
          ...paperProps.sx,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
        elevation={isInsideDropZone || isCollecting ? 24 : undefined}
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
    </DropZone>
  );
};

export default BarcodeImagesDropZone;
