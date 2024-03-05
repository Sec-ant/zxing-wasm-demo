import { Clear, FileOpen, FolderOpen } from "@mui/icons-material";
import {
  Box,
  Button,
  Fab,
  IconButton,
  Paper,
  type PaperProps,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import mobile from "is-mobile";
import { useCallback, useEffect, useState } from "react";

const allowedImageExtensions = new Set([
  "png",
  "jpg",
  "jpeg",
  "bmp",
  "psd",
  "gif",
]);

export interface BarcodeImagesDropZoneProps extends PaperProps {
  onBarcodeImagesDrop?: (files: File[]) => unknown;
}

const BarcodeImagesDropZone = ({
  onBarcodeImagesDrop,
  ...paperProps
}: BarcodeImagesDropZoneProps) => {
  const isMobile = useIsMobile();
  const [isInsideDropZone, setIsInsideDropZone] = useState<boolean>(false);
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [files, setFiles] = useState<File[]>([]);
  const theme = useTheme();
  const buttonCollapse = useMediaQuery(
    theme.breakpoints.down("buttonCollapse"),
  );

  useEffect(() => {
    onBarcodeImagesDrop?.(files);
  }, [files, onBarcodeImagesDrop]);

  const handlePaperMounted = useCallback((node: HTMLDivElement | null) => {
    if (node === null) {
      return;
    }

    node.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
      setIsInsideDropZone(true);
    });

    node.addEventListener("dragleave", (e) => {
      if (node.contains(e.relatedTarget as Node | null)) {
        return;
      }
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "none";
      }
      setIsInsideDropZone(false);
    });

    node.addEventListener("drop", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsInsideDropZone(false);
      setIsCollecting(true);
      if (e.dataTransfer) {
        const files: File[] = [];
        const items = takeDataTransferItemsSnapshot(e.dataTransfer.items);
        for await (const file of filterFiles(itemListFileGenerator(items))) {
          files.push(file);
        }
        setFiles(files);
      }
      setIsCollecting(false);
    });
  }, []);

  const handleFilesButtonClick = useCallback(async () => {
    setIsCollecting(true);
    const files: File[] = [];
    try {
      for await (const file of filterFiles(filesPickerFileGenerator())) {
        files.push(file);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        /* user aborted selection */
        setIsCollecting(false);
        return;
      }
    }
    setFiles(files);
    setIsCollecting(false);
  }, []);

  const handleDirectoryButtonClick = useCallback(async () => {
    setIsCollecting(true);
    const files: File[] = [];
    try {
      for await (const file of filterFiles(directoryPickerFileGenerator())) {
        files.push(file);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        /* user aborted selection */
        setIsCollecting(false);
        return;
      }
    }
    setFiles(files);
    setIsCollecting(false);
  }, []);

  const handleClearButtonClick = useCallback(async () => {
    setFiles([]);
  }, []);

  return (
    <>
      {isMobile && (
        <Box
          sx={{
            position: "fixed",
            right: 0,
            bottom: 0,
            margin: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          {files.length > 0 && (
            <Fab
              disabled={isCollecting}
              color="error"
              size="small"
              onClick={handleClearButtonClick}
            >
              <Clear />
            </Fab>
          )}
          <Fab
            disabled={isCollecting}
            color="primary"
            size="small"
            onClick={handleFilesButtonClick}
            sx={{
              marginTop: 1,
            }}
          >
            <FileOpen />
          </Fab>
        </Box>
      )}
      {!isMobile && (
        <Paper
          {...paperProps}
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flexGrow: 1,
            ...paperProps.sx,
          }}
          elevation={isInsideDropZone ? 24 : undefined}
          ref={handlePaperMounted}
        >
          <Box
            sx={{ display: "flex", justifyContent: "center", width: "100%" }}
          >
            <IconButton
              disabled
              size="small"
              sx={{ visibility: "hidden", height: "fit-content" }}
            >
              <Clear />
            </IconButton>
            <Box sx={{ flexGrow: 1 }} />
            {buttonCollapse && (
              <>
                <IconButton
                  disabled={isInsideDropZone || isCollecting}
                  size="small"
                  color="primary"
                  sx={{ m: 1 }}
                  onClick={handleFilesButtonClick}
                >
                  <FileOpen />
                </IconButton>
                <IconButton
                  disabled={isInsideDropZone || isCollecting}
                  size="small"
                  color="primary"
                  sx={{ m: 1 }}
                  onClick={handleDirectoryButtonClick}
                >
                  <FolderOpen />
                </IconButton>
              </>
            )}
            {!buttonCollapse && (
              <>
                <Button
                  disabled={isInsideDropZone || isCollecting}
                  variant="contained"
                  size="small"
                  startIcon={<FileOpen />}
                  sx={{ m: 1 }}
                  onClick={handleFilesButtonClick}
                >
                  Files
                </Button>
                <Button
                  disabled={isInsideDropZone || isCollecting}
                  variant="contained"
                  size="small"
                  startIcon={<FolderOpen />}
                  onClick={handleDirectoryButtonClick}
                  sx={{ m: 1 }}
                >
                  {buttonCollapse ? "" : "Directory"}
                </Button>
              </>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <IconButton
              disabled={isInsideDropZone || isCollecting}
              size="small"
              color="primary"
              onClick={handleClearButtonClick}
              sx={{
                visibility: files.length > 0 ? "inherit" : "hidden",
                height: "fit-content",
              }}
            >
              <Clear />
            </IconButton>
          </Box>
          <Typography
            variant="button"
            sx={{
              marginTop: 2,
              userSelect: "none",
            }}
          >
            Or drop them here
          </Typography>
        </Paper>
      )}
    </>
  );
};

function useIsMobile() {
  const [isMobile] = useState(mobile());
  return isMobile;
}

async function* filesPickerFileGenerator() {
  if (isFileSysmtemAccessSupported()) {
    const fileHandles = await window.showOpenFilePicker({
      multiple: true,
      types: [
        {
          description: "images",
          accept: {
            "image/*": [...allowedImageExtensions].map<`.${string}`>(
              (e) => `.${e}`,
            ),
          },
        },
      ],
      excludeAcceptAllOption: true,
    });
    for (const fileHandle of fileHandles) {
      yield await fileHandle.getFile();
    }
  } else {
    const fileList = await new Promise<FileList | null>((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.accept = `image/*, ${[...allowedImageExtensions]
        .map<`.${string}`>((e) => `.${e}`)
        .join(", ")}`;
      input.style.display = "none";
      document.body.append(input);
      const cancelDetector = () => {
        window.removeEventListener("focus", cancelDetector);
        input.remove();
      };
      input.addEventListener("click", () => {
        window.addEventListener("focus", cancelDetector);
      });
      input.addEventListener("cancel", () => {
        reject(new DOMException("The user aborted a request.", "AbortError"));
      });
      input.addEventListener("change", () => {
        window.removeEventListener("focus", cancelDetector);
        input.remove();
        resolve(input.files);
      });
      if ("showPicker" in HTMLInputElement.prototype) {
        input.showPicker();
      } else {
        input.click();
      }
    });
    for (const file of fileList ?? []) {
      yield file;
    }
  }
}

async function* directoryPickerFileGenerator() {
  if (isFileSysmtemAccessSupported()) {
    const directoryHandle = await window.showDirectoryPicker();
    yield* collectFilesFromDirectoryHandle(directoryHandle);
  } else {
    const fileList = await new Promise<FileList | null>((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.webkitdirectory = true;
      input.addEventListener("cancel", () => {
        reject(new DOMException("The user aborted a request.", "AbortError"));
      });
      input.addEventListener("change", () => {
        resolve(input.files);
      });
      if ("showPicker" in HTMLInputElement.prototype) {
        input.showPicker();
      } else {
        input.click();
      }
    });
    for (const file of fileList ?? []) {
      yield file;
    }
  }
}

async function* itemListFileGenerator(
  DataTransferItemList: Iterable<Partial<DataTransferItem>>,
) {
  for (const item of DataTransferItemList) {
    if (item.kind === "file") {
      if (isFileSysmtemAccessSupported()) {
        const handle = await item.getAsFileSystemHandle?.();
        if (!handle) {
          const file = item.getAsFile?.();
          if (file) {
            yield file;
          }
          continue;
        }
        if (isFileSystemFileHandle(handle)) {
          yield await handle.getFile();
        } else if (isFileSystemDirectoryHandle(handle)) {
          yield* collectFilesFromDirectoryHandle(handle);
        }
      } else {
        const entry = item.webkitGetAsEntry?.();
        if (!entry) {
          continue;
        }
        if (isFileSystemFileEntry(entry)) {
          yield await new Promise<File>((resolve, reject) =>
            entry.file(resolve, reject),
          );
        } else if (isFileSystemDirectoryEntry(entry)) {
          yield* collectFilesFromDirectoryEntry(entry);
        }
      }
    } else {
      /* void */
    }
  }
}

async function* collectFilesFromDirectoryHandle(
  directoryHandle: FileSystemDirectoryHandle,
): AsyncGenerator<File, void, unknown> {
  for await (const handle of directoryHandle.values()) {
    if (isFileSystemFileHandle(handle)) {
      yield await handle.getFile();
      continue;
    }
    if (isFileSystemDirectoryHandle(handle)) {
      yield* collectFilesFromDirectoryHandle(handle);
    }
  }
}

async function* collectFilesFromDirectoryEntry(
  directoryEntry: FileSystemDirectoryEntry,
): AsyncGenerator<File, void, unknown> {
  const directoryReader = directoryEntry.createReader();
  let batchOfEntries: FileSystemEntry[] = [];
  do {
    batchOfEntries = await new Promise((resolve, reject) =>
      directoryReader.readEntries(resolve, reject),
    );
    for (const entry of batchOfEntries) {
      if (isFileSystemFileEntry(entry)) {
        yield new Promise<File>((resolve, reject) =>
          entry.file(resolve, reject),
        );
        continue;
      }
      if (isFileSystemDirectoryEntry(entry)) {
        yield* collectFilesFromDirectoryEntry(entry);
      }
    }
  } while (batchOfEntries.length > 0);
}

async function* filterFiles(files: AsyncIterable<File>) {
  // TODO: use package file-type when this is implemented: https://github.com/sindresorhus/file-type/issues/578
  // for await (const file of files) {
  //   const buffer = new Uint8Array(await file.arrayBuffer(), 0, 4100);
  //   const result = await fileTypeFromBuffer(buffer);
  //   if (result && allowedImageExtensions.has(result.ext)) {
  //     yield file;
  //   }
  // }
  for await (const file of files) {
    const extension = file.name.match(/\.(.+?)$/)?.[1];
    if (extension && allowedImageExtensions.has(extension)) {
      yield file;
    }
  }
}

const isFileSysmtemAccessSupported = (() => {
  const isSupported = (() => {
    // When running in an SSR environment return `false`.
    if (typeof self === "undefined") {
      return false;
    }
    // TODO: Remove this check once Permissions Policy integration
    // has happened, tracked in
    // https://github.com/WICG/file-system-access/issues/245.
    if ("top" in self && self !== top) {
      try {
        // This will succeed on same-origin iframes,
        // but fail on cross-origin iframes.
        // This is longer than necessary, as else the minifier removes it.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        top!.window.document._ = 0;
      } catch {
        return false;
      }
    }
    if ("showOpenFilePicker" in self) {
      return true;
    }
    return false;
  })();
  return () => isSupported;
})();

function takeDataTransferItemsSnapshot(
  dataTransferItemList: DataTransferItemList,
) {
  const items: Partial<DataTransferItem>[] = [];
  for (const item of dataTransferItemList) {
    items.push({
      kind: item.kind,
      type: item.type,
      ...(item.getAsFile
        ? {
            getAsFile: (() => {
              try {
                const file = item.getAsFile();
                return () => file;
              } catch (e) {
                return () => {
                  throw e;
                };
              }
            })(),
          }
        : {}),
      ...(item.getAsFileSystemHandle
        ? {
            getAsFileSystemHandle: (() => {
              try {
                const handlePromise = item.getAsFileSystemHandle();
                return () => handlePromise;
              } catch (e) {
                return () => {
                  throw e;
                };
              }
            })(),
          }
        : {}),
      ...(item.getAsString
        ? {
            getAsString: (() => {
              try {
                const getAsStringFun = item.getAsString.bind(item);
                return (callback) => getAsStringFun(callback);
              } catch (e) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                return (_) => {
                  throw e;
                };
              }
            })(),
          }
        : {}),
      ...(item.webkitGetAsEntry
        ? {
            webkitGetAsEntry: (() => {
              try {
                const entry = item.webkitGetAsEntry();
                return () => entry;
              } catch (e) {
                return () => {
                  throw e;
                };
              }
            })(),
          }
        : {}),
    });
  }
  return items;
}

function isFileSystemFileHandle(
  handle: FileSystemHandle,
): handle is FileSystemFileHandle {
  return handle.kind === "file";
}

function isFileSystemDirectoryHandle(
  handle: FileSystemHandle,
): handle is FileSystemDirectoryHandle {
  return handle.kind === "directory";
}

function isFileSystemFileEntry(
  entry: FileSystemEntry,
): entry is FileSystemFileEntry {
  return entry.isFile;
}

function isFileSystemDirectoryEntry(
  entry: FileSystemEntry,
): entry is FileSystemDirectoryEntry {
  return entry.isDirectory;
}

export default BarcodeImagesDropZone;
