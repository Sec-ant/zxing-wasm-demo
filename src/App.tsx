import { Article, Code, GitHub, QrCodeScanner } from "@mui/icons-material";
import {
  AppBar,
  Checkbox,
  type CheckboxProps,
  Container,
  CssBaseline,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  List,
  MenuItem,
  Select,
  type SelectProps,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme,
  styled,
  useMediaQuery,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { spaceCase } from "case-anything";
import {
  type ChangeEventHandler,
  type FocusEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  subscribeWithSelector,
} from "zustand/middleware";
import {
  type Binarizer,
  type CharacterSet,
  type EanAddOnSymbol,
  type ReadInputBarcodeFormat,
  type ReaderOptions,
  type TextMode,
  ZXING_WASM_VERSION,
  barcodeFormats,
  binarizers,
  characterSets,
  defaultReaderOptions,
  eanAddOnSymbols,
  prepareZXingModule,
  readBarcodes,
  textModes,
} from "zxing-wasm/reader";

import { useDebounce } from "use-debounce";
import {
  array,
  fallback,
  finite,
  integer,
  maxValue,
  minValue,
  parse,
  picklist,
  pipe,
  string,
  transform,
} from "valibot";
import { resolveCDNUrl, supportedCDNs } from "./cdn";
import BarcodeImage from "./components/BarcodeImage";
import BarcodeImagesDropZone from "./components/BarcodeImagesDropZone";
import WheelTrappedOutlinedInput from "./components/WheelTrappedOutlinedInput";

const wasmLocations = ["site", ...supportedCDNs] as const;
type WasmLocation = (typeof wasmLocations)[number];

function resolveWasmUrl(wasmLocation: WasmLocation) {
  if (wasmLocation === "site") {
    return `/wasm/reader/${ZXING_WASM_VERSION}/zxing_reader.wasm`;
  }
  return resolveCDNUrl(
    wasmLocation,
    "zxing-wasm",
    ZXING_WASM_VERSION,
    "dist/reader/zxing_reader.wasm",
  );
}

function inFormats(
  formats: ReadInputBarcodeFormat[],
  checks: ReadInputBarcodeFormat[],
) {
  const formatsSet = new Set(formats);
  for (const check of checks) {
    if (formatsSet.has(check)) {
      return true;
    }
  }
  return false;
}

interface ZXingWasmDemoState extends Required<ReaderOptions> {
  wasmLocation: WasmLocation;
}

const defaultZXingWasmDemoState: ZXingWasmDemoState = {
  wasmLocation: "site",
  ...defaultReaderOptions,
};

const useZXingWasmDemoStore = create<ZXingWasmDemoState>()(
  subscribeWithSelector(
    persist(() => ({ ...defaultZXingWasmDemoState }), {
      name: "zxing-wasm-demo",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: unknown, version) => {
        interface ZXingWasmDemoStateV0
          extends Omit<ZXingWasmDemoState, "wasmLocation"> {
          wasmLocation: Exclude<WasmLocation, "site"> | "local";
        }
        if (((_): _ is ZXingWasmDemoStateV0 => version === 0)(persistedState)) {
          if (persistedState.wasmLocation === "local") {
            (persistedState as ZXingWasmDemoState).wasmLocation = "site";
          }
          return persistedState as ZXingWasmDemoState;
        }
        return persistedState as ZXingWasmDemoState;
      },
    }),
  ),
);

useZXingWasmDemoStore.setState({
  ...defaultZXingWasmDemoState,
});

const FlexGrid = styled(Grid)(() => ({
  display: "flex",
}));

const FlexGridFullHeight = styled(FlexGrid)`
  min-height: 100vh;
  min-height: 100dvh;
`;

const StyledFormControlLabel = styled(FormControlLabel)(() => ({
  flexGrow: 1,
  userSelect: "none",
  marginRight: 0,
  marginLeft: 0,
}));

const StyledCheckbox = styled(Checkbox)(() => ({
  padding: 2,
}));

declare module "@mui/system" {
  interface BreakpointOverrides {
    xs: true;
    mobile: true;
    buttonCollapse: true;
  }
}

const App = () => {
  /**
   * Theme
   */
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? "dark" : "light",
        },
        breakpoints: {
          values: {
            xs: 0,
            mobile: 300,
            buttonCollapse: 400,
            sm: 600,
            md: 900,
            lg: 1200,
            xl: 1536,
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: /* css */ `
              @font-face {
                font-family: "MonaspaceArgon";
                font-style: normal;
                src: url("/fonts/MonaspaceArgon-Regular.woff") format("woff");
              }
              @font-face {
                font-family: "MonaspaceKrypton";
                font-style: normal;
                src: url("/fonts/MonaspaceKrypton-Regular.woff") format("woff");
              }
              @font-face {
                font-family: "MonaspaceNeon";
                font-style: normal;
                src: url("/fonts/MonaspaceNeon-Regular.woff") format("woff");
              }
              @font-face {
                font-family: "MonaspaceRadon";
                font-style: normal;
                src: url("/fonts/MonaspaceRadon-Regular.woff") format("woff");
              }
              @font-face {
                font-family: "MonaspaceXenon";
                font-style: normal;
                src: url("/fonts/MonaspaceXenon-Regular.woff") format("woff");
              }
            `,
          },
        },
      }),
    [prefersDarkMode],
  );

  /**
   * Local States
   */
  const [images, setImages] = useState<Blob[]>([]);
  const [imageObjectUrls, setImageObjectUrls] = useState<string[]>([]);
  useEffect(() => {
    const imageObjectUrls = images.map((image) => URL.createObjectURL(image));
    setImageObjectUrls(imageObjectUrls);
    return () => {
      imageObjectUrls.map((imageObjectUrl) =>
        URL.revokeObjectURL(imageObjectUrl),
      );
    };
  }, [images]);

  /**
   * WASM Location and Module Overrides
   */
  const wasmLocationSchema = useCallback(
    (d: WasmLocation) => fallback(picklist(wasmLocations), d),
    [],
  );
  const { wasmLocation } = useZXingWasmDemoStore();
  const handleWasmLocationTypeChange = useCallback<
    Exclude<SelectProps<WasmLocation>["onChange"], undefined>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ wasmLocation }) => ({
        wasmLocation: parse(wasmLocationSchema(wasmLocation), value),
      }));
    },
    [wasmLocationSchema],
  );

  const [isFetchingZXingModule, setIsFetchingZXingModule] = useState(true);

  useEffect(() => {
    setIsFetchingZXingModule(true);
    prepareZXingModule({
      overrides: {
        locateFile: (path, prefix) =>
          path.endsWith(".wasm") ? resolveWasmUrl(wasmLocation) : prefix + path,
      },
      fireImmediately: true,
    }).then(() => setIsFetchingZXingModule(false));
  }, [wasmLocation]);

  /**
   * Formats
   */
  const formatsSchema = useCallback(
    (d: ReadInputBarcodeFormat[]) =>
      fallback(
        pipe(
          array(picklist(barcodeFormats)),
          transform(
            (formats) => [...new Set(formats)] as ReadInputBarcodeFormat[],
          ),
        ),
        d,
      ),
    [],
  );
  const { formats } = useZXingWasmDemoStore();
  const handleFormatsChange = useCallback<
    Exclude<SelectProps<ReadInputBarcodeFormat[]>["onChange"], undefined>
  >(
    ({ target: { value } }) => {
      if (typeof value === "string") {
        value = value.split(/,\s*/) as ReadInputBarcodeFormat[];
      }
      useZXingWasmDemoStore.setState(({ formats: [...formats] }) => ({
        formats: [...parse(formatsSchema(formats), value)],
      }));
    },
    [formatsSchema],
  );

  /**
   * Binarizer
   */
  const binarizerSchema = useCallback(
    (d: Binarizer) => fallback(picklist(binarizers), d),
    [],
  );
  const { binarizer } = useZXingWasmDemoStore();
  const handleBinarizerChange = useCallback<
    Exclude<SelectProps<Binarizer>["onChange"], undefined>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ binarizer }) => ({
        binarizer: parse(binarizerSchema(binarizer), value),
      }));
    },
    [binarizerSchema],
  );

  /**
   * Character Set
   */
  const characterSetSchema = useCallback(
    (d: CharacterSet) => fallback(picklist(characterSets), d),
    [],
  );
  const { characterSet } = useZXingWasmDemoStore();
  const handleCharacterSetChange = useCallback<
    Exclude<SelectProps<CharacterSet>["onChange"], undefined>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ characterSet }) => ({
        characterSet: parse(characterSetSchema(characterSet), value),
      }));
    },
    [characterSetSchema],
  );

  /**
   * Maximum Number of Symbols
   */
  const minMaxNumberOfSymbols = 1;
  const maxMaxNumberOfSymbols = 255;
  const maxNumberOfSymbolsSchema = useCallback(
    (d: number) =>
      fallback(
        pipe(
          string(),
          transform((input) => Number.parseInt(input, 10)),
          integer(),
          minValue(minMaxNumberOfSymbols),
          maxValue(maxMaxNumberOfSymbols),
        ),
        d,
      ),
    [],
  );
  const { maxNumberOfSymbols } = useZXingWasmDemoStore();
  const [maxNumberOfSymbolsDisplay, setMaxNumberOfSymbolsDisplay] = useState(
    `${maxNumberOfSymbols}`,
  );
  const handleMaxNumberOfSymbolsChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >(
    ({ target: { value } }) => {
      setMaxNumberOfSymbolsDisplay(value);
      useZXingWasmDemoStore.setState(({ maxNumberOfSymbols }) => ({
        maxNumberOfSymbols: parse(
          maxNumberOfSymbolsSchema(maxNumberOfSymbols),
          value,
        ),
      }));
    },
    [maxNumberOfSymbolsSchema],
  );
  const handleMaxNumberOfSymbolsBlur = useCallback<
    FocusEventHandler<HTMLInputElement>
  >(() => {
    setMaxNumberOfSymbolsDisplay(`${maxNumberOfSymbols}`);
  }, [maxNumberOfSymbols]);

  /**
   * Minimum Line Count
   */
  const minMinLineCount = 1;
  const minLineCountSchema = useCallback(
    (d: number) =>
      fallback(
        pipe(
          string(),
          transform((input) => Number.parseInt(input, 10)),
          integer(),
          minValue(minMinLineCount),
        ),
        d,
      ),
    [],
  );
  const { minLineCount } = useZXingWasmDemoStore();
  const [minLineCountDisplay, setMinLineCountDisplay] = useState(
    `${minLineCount}`,
  );
  const handleMinLineCountChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >(
    ({ target: { value } }) => {
      setMinLineCountDisplay(value);
      useZXingWasmDemoStore.setState(({ minLineCount }) => ({
        minLineCount: parse(minLineCountSchema(minLineCount), value),
      }));
    },
    [minLineCountSchema],
  );
  const handleMinLineCountBlur = useCallback<
    FocusEventHandler<HTMLInputElement>
  >(() => {
    setMinLineCountDisplay(`${minLineCount}`);
  }, [minLineCount]);

  /**
   * EAN Addon Symbol
   */
  const eanAddOnSymbolSchema = useCallback(
    (d: EanAddOnSymbol) => fallback(picklist(eanAddOnSymbols), d),
    [],
  );
  const { eanAddOnSymbol } = useZXingWasmDemoStore();
  const handleEanAddonSymbolChange = useCallback<
    Exclude<SelectProps<EanAddOnSymbol>["onChange"], undefined>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ eanAddOnSymbol }) => ({
        eanAddOnSymbol: parse(eanAddOnSymbolSchema(eanAddOnSymbol), value),
      }));
    },
    [eanAddOnSymbolSchema],
  );

  /**
   * Text Mode
   */
  const textModeSchema = useCallback(
    (d: TextMode) => fallback(picklist(textModes), d),
    [],
  );
  const { textMode } = useZXingWasmDemoStore();
  const handleTextModeChange = useCallback<
    Exclude<SelectProps<TextMode>["onChange"], undefined>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ textMode }) => ({
        textMode: parse(textModeSchema(textMode), value),
      }));
    },
    [textModeSchema],
  );

  /**
   * Try Harder
   */
  const { tryHarder } = useZXingWasmDemoStore();
  const handleTryHarderChange = useCallback<
    Exclude<CheckboxProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      tryHarder: checked,
    });
  }, []);

  /**
   * Try Rotate
   */
  const { tryRotate } = useZXingWasmDemoStore();
  const handleTryRotateChange = useCallback<
    Exclude<CheckboxProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      tryRotate: checked,
    });
  }, []);

  /**
   * Try Invert
   */
  const { tryInvert } = useZXingWasmDemoStore();
  const handleTryInvertChange = useCallback<
    Exclude<CheckboxProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      tryInvert: checked,
    });
  }, []);

  /**
   * Try Denoise
   */
  const { tryDenoise } = useZXingWasmDemoStore();
  const handleTryDenoiseChange = useCallback<
    Exclude<CheckboxProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      tryDenoise: checked,
    });
  }, []);

  /**
   * Is Pure
   */
  const { isPure } = useZXingWasmDemoStore();
  const handleIsPureChange = useCallback<
    Exclude<CheckboxProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      isPure: checked,
    });
  }, []);

  /**
   * Return Errors
   */
  const { returnErrors } = useZXingWasmDemoStore();
  const handleReturnErrorsChange = useCallback<
    Exclude<CheckboxProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      returnErrors: checked,
    });
  }, []);

  /**
   * Try Downscale
   */
  const { tryDownscale } = useZXingWasmDemoStore();
  const handleTryDownscaleChange = useCallback<
    Exclude<CheckboxProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      tryDownscale: checked,
    });
  }, []);

  /**
   * Downscale Threshold
   */
  const minDownscaleThreshold = 0;
  const downscaleThresholdSchema = useCallback(
    (d: number) =>
      fallback(
        pipe(
          string(),
          transform((input) => Number.parseInt(input, 10)),
          integer(),
          finite(),
          minValue(minDownscaleThreshold),
        ),
        d,
      ),
    [],
  );
  const { downscaleThreshold } = useZXingWasmDemoStore();
  const [downscaleThresholdDisplay, setDownscaleThresholdDisplay] = useState(
    `${downscaleThreshold}`,
  );
  const handleDownscaleThresholdChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >(
    ({ target: { value } }) => {
      setDownscaleThresholdDisplay(value);
      useZXingWasmDemoStore.setState(({ downscaleThreshold }) => ({
        downscaleThreshold: parse(
          downscaleThresholdSchema(downscaleThreshold),
          value,
        ),
      }));
    },
    [downscaleThresholdSchema],
  );
  const handleDownscaleThresholdBlur = useCallback<
    FocusEventHandler<HTMLInputElement>
  >(() => {
    setDownscaleThresholdDisplay(`${downscaleThreshold}`);
  }, [downscaleThreshold]);

  /**
   * Downscale Factor
   */
  const minDownscaleFactor = 2;
  const maxDownscaleFactor = 4;
  const downscaleFactorSchema = useCallback(
    (d: number) =>
      fallback(
        pipe(
          string(),
          transform((input) => Number.parseInt(input, 10)),
          integer(),
          finite(),
          minValue(minDownscaleFactor),
          maxValue(maxDownscaleFactor),
        ),
        d,
      ),
    [],
  );
  const { downscaleFactor } = useZXingWasmDemoStore();
  const [downscaleFactorDisplay, setDownscaleFactorDisplay] = useState(
    `${downscaleFactor}`,
  );
  const handleDownscaleFactorChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >(
    ({ target: { value } }) => {
      setDownscaleFactorDisplay(value);
      useZXingWasmDemoStore.setState(({ downscaleFactor }) => ({
        downscaleFactor: parse(downscaleFactorSchema(downscaleFactor), value),
      }));
    },
    [downscaleFactorSchema],
  );
  const handleDownscaleFactorBlur = useCallback<
    FocusEventHandler<HTMLInputElement>
  >(() => {
    setDownscaleFactorDisplay(`${downscaleFactor}`);
  }, [downscaleFactor]);

  /**
   * Try Code39 Extended Mode
   */
  const { tryCode39ExtendedMode } = useZXingWasmDemoStore();
  const handleTryCode39ExtendedModeChange = useCallback<
    Exclude<CheckboxProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      tryCode39ExtendedMode: checked,
    });
  }, []);

  /**
   * Handle Wheel Horizontally
   */
  const handleWheel = useCallback((event: WheelEvent) => {
    const { currentTarget, deltaY, ctrlKey } = event as typeof event & {
      currentTarget: HTMLDivElement;
    };
    if (!ctrlKey) {
      event.preventDefault();
      currentTarget.scrollLeft += deltaY;
    }
  }, []);
  const wheelTarget = useRef<HTMLDivElement | null>(null);
  const addWheelEventListener = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        node.addEventListener("wheel", handleWheel, { passive: false });
        wheelTarget.current = node;
      } else if (wheelTarget.current) {
        wheelTarget.current.removeEventListener("wheel", handleWheel);
      }
    },
    [handleWheel],
  );

  /**
   * Construct Detect Function
   */
  const DEBOUNCE_DELAY = 500;
  const [debouncedWasmLocation] = useDebounce(wasmLocation, DEBOUNCE_DELAY);
  const [debouncedFormats] = useDebounce(formats, DEBOUNCE_DELAY);
  const [debouncedBinarizer] = useDebounce(binarizer, DEBOUNCE_DELAY);
  const [debouncedCharacterSet] = useDebounce(characterSet, DEBOUNCE_DELAY);
  const [debouncedMaxNumberOfSymbols] = useDebounce(
    maxNumberOfSymbols,
    DEBOUNCE_DELAY,
  );
  const [debouncedMinLineCount] = useDebounce(minLineCount, DEBOUNCE_DELAY);
  const [debouncedEanAddOnSymbol] = useDebounce(eanAddOnSymbol, DEBOUNCE_DELAY);
  const [debouncedTextMode] = useDebounce(textMode, DEBOUNCE_DELAY);
  const [debouncedTryHarder] = useDebounce(tryHarder, DEBOUNCE_DELAY);
  const [debouncedTryRotate] = useDebounce(tryRotate, DEBOUNCE_DELAY);
  const [debouncedTryInvert] = useDebounce(tryInvert, DEBOUNCE_DELAY);
  const [debouncedTryDenoise] = useDebounce(tryDenoise, DEBOUNCE_DELAY);
  const [debouncedIsPure] = useDebounce(isPure, DEBOUNCE_DELAY);
  const [debouncedReturnErrors] = useDebounce(returnErrors, DEBOUNCE_DELAY);
  const [debouncedTryDownscale] = useDebounce(tryDownscale, DEBOUNCE_DELAY);
  const [debouncedDownscaleThreshold] = useDebounce(
    downscaleThreshold,
    DEBOUNCE_DELAY,
  );
  const [debouncedDownscaleFactor] = useDebounce(
    downscaleFactor,
    DEBOUNCE_DELAY,
  );
  const [debouncedTryCode39ExtendedMode] = useDebounce(
    tryCode39ExtendedMode,
    DEBOUNCE_DELAY,
  );
  const detect = useMemo(() => {
    debouncedWasmLocation;
    return (image: Blob) =>
      readBarcodes(image, {
        formats: debouncedFormats,
        binarizer: debouncedBinarizer,
        characterSet: debouncedCharacterSet,
        maxNumberOfSymbols: debouncedMaxNumberOfSymbols,
        minLineCount: debouncedMinLineCount,
        eanAddOnSymbol: debouncedEanAddOnSymbol,
        textMode: debouncedTextMode,
        tryHarder: debouncedTryHarder,
        tryRotate: debouncedTryRotate,
        tryInvert: debouncedTryInvert,
        tryDenoise: debouncedTryDenoise,
        isPure: debouncedIsPure,
        returnErrors: debouncedReturnErrors,
        tryDownscale: debouncedTryDownscale,
        downscaleThreshold: debouncedDownscaleThreshold,
        downscaleFactor: debouncedDownscaleFactor,
        tryCode39ExtendedMode: debouncedTryCode39ExtendedMode,
      });
  }, [
    debouncedWasmLocation,
    debouncedBinarizer,
    debouncedCharacterSet,
    debouncedDownscaleFactor,
    debouncedDownscaleThreshold,
    debouncedEanAddOnSymbol,
    debouncedFormats,
    debouncedIsPure,
    debouncedMaxNumberOfSymbols,
    debouncedMinLineCount,
    debouncedReturnErrors,
    debouncedTextMode,
    debouncedTryCode39ExtendedMode,
    debouncedTryDownscale,
    debouncedTryHarder,
    debouncedTryInvert,
    debouncedTryRotate,
    debouncedTryDenoise,
  ]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <FlexGridFullHeight
        container
        flexDirection="column"
        justifyContent="space-between"
      >
        <AppBar position="sticky" color="primary" enableColorOnDark>
          <Toolbar variant="dense">
            <QrCodeScanner sx={{ marginRight: 1 }} />
            <Typography
              fontWeight={700}
              variant="h6"
              component="div"
              sx={{
                flexGrow: 1,
                overflow: "hidden",
                textWrap: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              ZXing WASM Demo
            </Typography>
            <Tooltip title="GitHub Repository">
              <IconButton
                size="small"
                aria-label="github repository"
                color="inherit"
                onClick={() =>
                  window.open("https://github.com/Sec-ant/zxing-wasm", "_blank")
                }
              >
                <GitHub />
              </IconButton>
            </Tooltip>
            <Tooltip title="Document">
              <IconButton
                size="small"
                aria-label="document"
                color="inherit"
                onClick={() =>
                  window.open("https://zxing-wasm.deno.dev", "_blank")
                }
              >
                <Article />
              </IconButton>
            </Tooltip>
            <Tooltip title="Demo Source Code">
              <IconButton
                size="small"
                aria-label="demo source code"
                color="inherit"
                onClick={() =>
                  window.open(
                    "https://github.com/Sec-ant/zxing-wasm-demo",
                    "_blank",
                  )
                }
              >
                <Code />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        <Container
          maxWidth="md"
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minWidth: 250,
            marginTop: 2,
            marginBottom: 2,
            flexGrow: 1,
          }}
        >
          <FlexGrid
            container
            flexDirection="column"
            justifyContent="center"
            flexGrow={1}
          >
            <FlexGrid container spacing={2}>
              <FlexGrid size={{ xs: 12 }}>
                <BarcodeImagesDropZone
                  onBarcodeImagesDrop={(files) => {
                    setImages(files);
                  }}
                />
              </FlexGrid>
              <FlexGrid size={{ xs: 12, mobile: 6, sm: 3 }}>
                <FormControl sx={{ flexGrow: 1 }} size="small">
                  <InputLabel id="wasm-location-label">{`WASM Location${
                    isFetchingZXingModule ? " (loading)" : ""
                  }`}</InputLabel>
                  <Select
                    labelId="wasm-location-label"
                    label={`WASM Location${
                      isFetchingZXingModule ? " (loading)" : ""
                    }`}
                    id="wasm-location"
                    value={wasmLocation}
                    onChange={handleWasmLocationTypeChange}
                  >
                    {wasmLocations.map((wasmLocation) => (
                      <MenuItem dense key={wasmLocation} value={wasmLocation}>
                        {wasmLocation}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </FlexGrid>
              <FlexGrid size={{ xs: 12, mobile: 6, sm: 3 }}>
                <FormControl sx={{ flexGrow: 1 }} size="small">
                  <InputLabel id="formats-label">Formats</InputLabel>
                  <Select
                    labelId="formats-label"
                    label="Formats"
                    id="formats"
                    multiple
                    value={formats}
                    onChange={handleFormatsChange}
                  >
                    {barcodeFormats.map((barcodeFormat) => (
                      <MenuItem dense key={barcodeFormat} value={barcodeFormat}>
                        {barcodeFormat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </FlexGrid>
              <FlexGrid size={{ xs: 12, mobile: 6, sm: 3 }}>
                <FormControl sx={{ flexGrow: 1 }} size="small">
                  <InputLabel id="binarizer-label">Binarizer</InputLabel>
                  <Select
                    labelId="binarizer-label"
                    label="Binarizer"
                    id="binarizer"
                    value={binarizer}
                    onChange={handleBinarizerChange}
                  >
                    {binarizers.map((binarizer) => (
                      <MenuItem dense key={binarizer} value={binarizer}>
                        {spaceCase(binarizer)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </FlexGrid>
              <FlexGrid size={{ xs: 12, mobile: 6, sm: 3 }}>
                <FormControl sx={{ flexGrow: 1 }} size="small">
                  <InputLabel id="character-set-label">
                    Character Set
                  </InputLabel>
                  <Select
                    labelId="character-set-label"
                    label="Character Set"
                    id="character-set"
                    value={characterSet}
                    onChange={handleCharacterSetChange}
                  >
                    {characterSets.map((characterSet) => (
                      <MenuItem dense key={characterSet} value={characterSet}>
                        {characterSet}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </FlexGrid>
              <FlexGrid size={{ xs: 12, mobile: 6, sm: 3 }}>
                <FormControl sx={{ flexGrow: 1 }} size="small">
                  <InputLabel htmlFor="max-number-of-symbols">
                    Maximum Number of Symbols
                  </InputLabel>
                  <WheelTrappedOutlinedInput
                    label="Maximum Number of Symbols"
                    id="max-number-of-symbols"
                    type="number"
                    inputMode="numeric"
                    inputProps={{
                      min: 1,
                      max: 255,
                      step: 1,
                    }}
                    value={maxNumberOfSymbolsDisplay}
                    onChange={handleMaxNumberOfSymbolsChange}
                    onBlur={handleMaxNumberOfSymbolsBlur}
                  />
                </FormControl>
              </FlexGrid>
              <FlexGrid size={{ xs: 12, mobile: 6, sm: 3 }}>
                <FormControl
                  sx={{ flexGrow: 1 }}
                  size="small"
                  disabled={
                    !(
                      formats.length === 0 ||
                      inFormats(formats, [
                        "Codabar",
                        "Code39",
                        "Code93",
                        "Code128",
                        "EAN-8",
                        "EAN-13",
                        "ITF",
                        "DataBar",
                        "DataBarExpanded",
                        "DataBarLimited",
                        "UPC-A",
                        "UPC-E",
                        "Linear-Codes",
                      ])
                    )
                  }
                >
                  <InputLabel htmlFor="min-line-count">
                    Minimum Line Count
                  </InputLabel>
                  <WheelTrappedOutlinedInput
                    label="Minimum Line Count"
                    id="min-line-count"
                    type="number"
                    inputMode="numeric"
                    inputProps={{
                      min: minMinLineCount,
                      step: 1,
                    }}
                    value={minLineCountDisplay}
                    onChange={handleMinLineCountChange}
                    onBlur={handleMinLineCountBlur}
                  />
                </FormControl>
              </FlexGrid>
              <FlexGrid size={{ xs: 12, mobile: 6, sm: 3 }}>
                <FormControl
                  sx={{ flexGrow: 1 }}
                  size="small"
                  disabled={
                    !(
                      formats.length === 0 ||
                      inFormats(formats, [
                        "EAN-8",
                        "EAN-13",
                        "UPC-A",
                        "UPC-E",
                        "Linear-Codes",
                      ])
                    )
                  }
                >
                  <InputLabel id="ean-addon-symbol-label">
                    EAN Addon Symbol
                  </InputLabel>
                  <Select
                    labelId="ean-addon-symbol-label"
                    label="EAN Addon Symbol"
                    id="ean-addon-symbol"
                    value={eanAddOnSymbol}
                    onChange={handleEanAddonSymbolChange}
                  >
                    {eanAddOnSymbols.map((eanAddonSymbol) => (
                      <MenuItem
                        dense
                        key={eanAddonSymbol}
                        value={eanAddonSymbol}
                      >
                        {eanAddonSymbol}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </FlexGrid>
              <FlexGrid size={{ xs: 12, mobile: 6, sm: 3 }}>
                <FormControl sx={{ flexGrow: 1 }} size="small">
                  <InputLabel id="text-mode-label">Text Mode</InputLabel>
                  <Select
                    labelId="text-mode-label"
                    label="Text Mode"
                    id="text-mode"
                    value={textMode}
                    onChange={handleTextModeChange}
                  >
                    {textModes.map((textMode) => (
                      <MenuItem dense key={textMode} value={textMode}>
                        {textMode}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </FlexGrid>
              <FlexGrid size={{ xs: 6, mobile: 4, sm: 3 }}>
                <StyledFormControlLabel
                  label="Try Harder"
                  control={
                    <StyledCheckbox
                      size="small"
                      checked={tryHarder}
                      onChange={handleTryHarderChange}
                    />
                  }
                />
              </FlexGrid>
              <FlexGrid size={{ xs: 6, mobile: 4, sm: 3 }}>
                <StyledFormControlLabel
                  label="Try Rotate"
                  control={
                    <StyledCheckbox
                      size="small"
                      checked={tryRotate}
                      onChange={handleTryRotateChange}
                    />
                  }
                />
              </FlexGrid>
              <FlexGrid size={{ xs: 6, mobile: 4, sm: 3 }}>
                <StyledFormControlLabel
                  label="Try Invert"
                  control={
                    <StyledCheckbox
                      size="small"
                      checked={tryInvert}
                      onChange={handleTryInvertChange}
                    />
                  }
                />
              </FlexGrid>
              <FlexGrid size={{ xs: 6, mobile: 4, sm: 3 }}>
                <StyledFormControlLabel
                  label="Try Denoise"
                  control={
                    <StyledCheckbox
                      size="small"
                      checked={tryDenoise}
                      onChange={handleTryDenoiseChange}
                    />
                  }
                />
              </FlexGrid>
              <FlexGrid size={{ xs: 6, mobile: 4, sm: 3 }}>
                <StyledFormControlLabel
                  label="Is Pure"
                  control={
                    <StyledCheckbox
                      size="small"
                      checked={isPure}
                      onChange={handleIsPureChange}
                    />
                  }
                />
              </FlexGrid>
              <FlexGrid size={{ xs: 6, mobile: 4, sm: 3 }}>
                <StyledFormControlLabel
                  label="Try Downscale"
                  control={
                    <StyledCheckbox
                      size="small"
                      checked={tryDownscale}
                      onChange={handleTryDownscaleChange}
                    />
                  }
                />
              </FlexGrid>
              <FlexGrid size={{ xs: 6, sm: 3 }}>
                <FormControl
                  disabled={!tryDownscale}
                  sx={{ flexGrow: 1 }}
                  size="small"
                >
                  <InputLabel htmlFor="downscale-threshold">
                    Downscale Threshold
                  </InputLabel>
                  <WheelTrappedOutlinedInput
                    label="Downscale Threshold"
                    id="downscale-threshold"
                    type="number"
                    inputMode="numeric"
                    inputProps={{
                      min: minDownscaleThreshold,
                      step: 10,
                    }}
                    value={downscaleThresholdDisplay}
                    onChange={handleDownscaleThresholdChange}
                    onBlur={handleDownscaleThresholdBlur}
                    endAdornment={
                      <InputAdornment position="end">px</InputAdornment>
                    }
                  />
                </FormControl>
              </FlexGrid>
              <FlexGrid size={{ xs: 6, sm: 3 }}>
                <FormControl
                  disabled={!tryDownscale}
                  sx={{ flexGrow: 1 }}
                  size="small"
                >
                  <InputLabel htmlFor="downscale-factor">
                    Downscale Factor
                  </InputLabel>
                  <WheelTrappedOutlinedInput
                    label="Downscale Factor"
                    id="downscale-factor"
                    type="number"
                    inputMode="numeric"
                    inputProps={{
                      min: minDownscaleFactor,
                      max: maxDownscaleFactor,
                      step: 1,
                    }}
                    value={downscaleFactorDisplay}
                    onChange={handleDownscaleFactorChange}
                    onBlur={handleDownscaleFactorBlur}
                  />
                </FormControl>
              </FlexGrid>
              <FlexGrid size={{ xs: 6, mobile: 4, sm: 3 }}>
                <StyledFormControlLabel
                  label="Return Errors"
                  control={
                    <StyledCheckbox
                      size="small"
                      checked={returnErrors}
                      onChange={handleReturnErrorsChange}
                    />
                  }
                />
              </FlexGrid>
              <FlexGrid size={{ xs: 12, mobile: 6 }}>
                <StyledFormControlLabel
                  label="Try Code39 Extended Mode"
                  control={
                    <StyledCheckbox
                      size="small"
                      checked={tryCode39ExtendedMode}
                      onChange={handleTryCode39ExtendedModeChange}
                    />
                  }
                  disabled={
                    !(
                      formats.length === 0 ||
                      inFormats(formats, ["Code39", "Linear-Codes"])
                    )
                  }
                />
              </FlexGrid>
            </FlexGrid>
            <FlexGrid
              size={{ xs: 12 }}
              justifyContent="center"
              flexGrow={1}
              maxHeight={360}
            >
              <List
                ref={addWheelEventListener}
                component="div"
                sx={{
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "row",
                  maxHeight: 360,
                  paddingLeft: 1,
                  paddingRight: 1,
                  overflowX: "auto",
                  "&::before, &::after": {
                    content: `""`,
                    margin: "auto",
                  },
                }}
              >
                {imageObjectUrls.map((imageObjectUrl) => (
                  <BarcodeImage
                    key={imageObjectUrl}
                    src={imageObjectUrl}
                    detect={detect}
                  />
                ))}
              </List>
            </FlexGrid>
          </FlexGrid>
        </Container>
        <FlexGrid container>
          <Toolbar variant="dense" sx={{ width: "100%" }}>
            <FlexGrid container gap={1} width="100%" justifyContent="center">
              <Typography variant="body2">
                powered by:{" "}
                <span>
                  <Link
                    underline="hover"
                    href="https://github.com/Sec-ant/zxing-wasm"
                    sx={{
                      mr: 0,
                    }}
                  >
                    zxing-wasm
                  </Link>
                  @
                  <Link
                    underline="hover"
                    href={`https://www.npmjs.com/package/zxing-wasm/v/${ZXING_WASM_VERSION}`}
                  >
                    {ZXING_WASM_VERSION}
                  </Link>
                </span>
              </Typography>
            </FlexGrid>
          </Toolbar>
        </FlexGrid>
      </FlexGridFullHeight>
    </ThemeProvider>
  );
};

export default App;
