import { Article, GitHub, QrCodeScanner } from "@mui/icons-material";
import {
  AppBar,
  Box,
  Checkbox,
  CheckboxProps,
  Container,
  CssBaseline,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  MenuItem,
  OutlinedInput,
  Select,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
  styled,
  useMediaQuery,
  type SelectProps,
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { spaceCase } from "case-anything";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
} from "react";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  subscribeWithSelector,
} from "zustand/middleware";
import {
  barcodeFormats,
  binarizers,
  characterSets,
  eanAddOnSymbols,
  readBarcodesFromImageFile,
  setZXingModuleOverrides,
  textModes,
  type Binarizer,
  type CharacterSet,
  type DecodeHints,
  type EanAddOnSymbol,
  type ReadInputBarcodeFormat,
  type TextMode,
} from "zxing-wasm/reader";

import { useDebounce } from "usehooks-ts";
import {
  array,
  fallback,
  finite,
  integer,
  maxValue,
  minValue,
  parse,
  picklist,
  string,
  transform,
} from "valibot";
import { resolveCDNUrl, supportedCDNs } from "./cdn";
import BarcodeImage from "./components/BarcodeImage";
import BarcodeImagesDropZone from "./components/BarcodeImagesDropZone";

const wasmLocations = ["local", ...supportedCDNs] as const;
type WasmLocation = (typeof wasmLocations)[number];

function resolveWasmUrl(wasmLocation: WasmLocation) {
  if (wasmLocation === "local") {
    return `/zxing_reader.wasm?v=${encodeURIComponent(ZXING_WASM_VERSION)}`;
  }
  return resolveCDNUrl(
    wasmLocation,
    "zxing-wasm",
    ZXING_WASM_VERSION,
    "dist/reader/zxing_reader.wasm",
  );
}

interface ZXingWasmDemoState extends Required<DecodeHints> {
  wasmLocation: WasmLocation;
}

const defaultZXingWasmDemoState: ZXingWasmDemoState = {
  wasmLocation: "local",
  binarizer: "LocalAverage",
  characterSet: "UTF8",
  downscaleFactor: 3,
  downscaleThreshold: 500,
  eanAddOnSymbol: "Read",
  formats: [],
  isPure: false,
  maxNumberOfSymbols: 255,
  minLineCount: 2,
  returnCodabarStartEnd: false,
  returnErrors: false,
  textMode: "Plain",
  tryCode39ExtendedMode: false,
  tryDownscale: true,
  tryHarder: true,
  tryInvert: true,
  tryRotate: true,
  validateCode39CheckSum: false,
  validateITFCheckSum: false,
};

const useZXingWasmDemoStore = create<ZXingWasmDemoState>()(
  subscribeWithSelector(
    persist(() => ({ ...defaultZXingWasmDemoState }), {
      name: "zxing-wasm-demo",
      version: 0,
      storage: createJSONStorage(() => localStorage),
    }),
  ),
);

const FlexGrid = styled(Grid)(() => ({
  display: "flex",
}));

const StyledFormControlLabel = styled(FormControlLabel)(() => ({
  flexGrow: 1,
  userSelect: "none",
  marginRight: 0,
  marginLeft: 0,
}));

const StyledCheckbox = styled(Checkbox)(() => ({
  padding: 2,
}));

declare module "@mui/material/styles" {
  interface BreakpointOverrides {
    mobile: true;
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
  useEffect(() => {
    setZXingModuleOverrides({
      locateFile: (path, prefix) =>
        path.endsWith(".wasm") ? resolveWasmUrl(wasmLocation) : prefix + path,
    });
  }, [wasmLocation]);

  /**
   * Formats
   */
  const formatsSchema = useCallback(
    (d: ReadInputBarcodeFormat[]) =>
      fallback(
        transform(
          array(picklist(barcodeFormats)),
          (formats) =>
            [...new Set(formats)].filter(
              (f) => f !== "None",
            ) as ReadInputBarcodeFormat[],
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
        transform(string(), (input) => parseInt(input, 10), [
          integer(),
          minValue(minMaxNumberOfSymbols),
          maxValue(maxMaxNumberOfSymbols),
        ]),
        d,
      ),
    [],
  );
  const { maxNumberOfSymbols } = useZXingWasmDemoStore();
  const handleMaxNumberOfSymbolsChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ maxNumberOfSymbols }) => ({
        maxNumberOfSymbols: parse(
          maxNumberOfSymbolsSchema(maxNumberOfSymbols),
          value,
        ),
      }));
    },
    [maxNumberOfSymbolsSchema],
  );

  /**
   * Minimum Line Count
   */
  const minMinLineCount = 1;
  const minLineCountSchema = useCallback(
    (d: number) =>
      fallback(
        transform(string(), (input) => parseInt(input, 10), [
          integer(),
          minValue(minMinLineCount),
        ]),
        d,
      ),
    [],
  );
  const { minLineCount } = useZXingWasmDemoStore();
  const handleMinLineCountChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ minLineCount }) => ({
        minLineCount: parse(minLineCountSchema(minLineCount), value),
      }));
    },
    [minLineCountSchema],
  );

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
        transform(string(), (input) => parseInt(input, 10), [
          integer(),
          finite(),
          minValue(minDownscaleThreshold),
        ]),
        d,
      ),
    [],
  );
  const { downscaleThreshold } = useZXingWasmDemoStore();
  const handleDownscaleThresholdChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ downscaleThreshold }) => ({
        downscaleThreshold: parse(
          downscaleThresholdSchema(downscaleThreshold),
          value,
        ),
      }));
    },
    [downscaleThresholdSchema],
  );

  /**
   * Downscale Factor
   */
  const minDownscaleFactor = 2;
  const maxDownscaleFactor = 4;
  const downscaleFactorSchema = useCallback(
    (d: number) =>
      fallback(
        transform(string(), (input) => parseInt(input, 10), [
          integer(),
          finite(),
          minValue(minDownscaleFactor),
          maxValue(maxDownscaleFactor),
        ]),
        d,
      ),
    [],
  );
  const { downscaleFactor } = useZXingWasmDemoStore();
  const handleDownscaleFactorChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ downscaleFactor }) => ({
        downscaleFactor: parse(downscaleFactorSchema(downscaleFactor), value),
      }));
    },
    [downscaleFactorSchema],
  );

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
   * Validate Code39 Checksum
   */
  const { validateCode39CheckSum } = useZXingWasmDemoStore();
  const handleValidateCode39CheckSumChange = useCallback<
    Exclude<CheckboxProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      validateCode39CheckSum: checked,
    });
  }, []);

  /**
   * Validate ITF Checksum
   */
  const { validateITFCheckSum } = useZXingWasmDemoStore();
  const handleValidateITFCheckSumChange = useCallback<
    Exclude<CheckboxProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      validateITFCheckSum: checked,
    });
  }, []);

  /**
   * Return Codabar Start End
   */
  const { returnCodabarStartEnd } = useZXingWasmDemoStore();
  const handleReturnCodabarStartEndChange = useCallback<
    Exclude<CheckboxProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      returnCodabarStartEnd: checked,
    });
  }, []);

  /**
   * Handle Wheel Horizontally
   */
  const handleWheel = useCallback((event: WheelEvent) => {
    const { currentTarget, deltaY } = event as typeof event & {
      currentTarget: HTMLDivElement;
    };
    const toLeft = deltaY < 0 && currentTarget.scrollLeft > 0;
    const toRight =
      deltaY > 0 &&
      currentTarget.scrollLeft <
        currentTarget.scrollWidth - currentTarget.clientWidth;
    if (toLeft || toRight) {
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
  const debouncedWasmLocation = useDebounce(wasmLocation);
  const debouncedFormats = useDebounce(formats);
  const debouncedBinarizer = useDebounce(binarizer);
  const debouncedCharacterSet = useDebounce(characterSet);
  const debouncedMaxNumberOfSymbols = useDebounce(maxNumberOfSymbols);
  const debouncedMinLineCount = useDebounce(minLineCount);
  const debouncedEanAddOnSymbol = useDebounce(eanAddOnSymbol);
  const debouncedTextMode = useDebounce(textMode);
  const debouncedTryHarder = useDebounce(tryHarder);
  const debouncedTryRotate = useDebounce(tryRotate);
  const debouncedTryInvert = useDebounce(tryInvert);
  const debouncedIsPure = useDebounce(isPure);
  const debouncedReturnErrors = useDebounce(returnErrors);
  const debouncedTryDownscale = useDebounce(tryDownscale);
  const debouncedDownscaleThreshold = useDebounce(downscaleThreshold);
  const debouncedDownscaleFactor = useDebounce(downscaleFactor);
  const debouncedTryCode39ExtendedMode = useDebounce(tryCode39ExtendedMode);
  const debouncedValidateCode39CheckSum = useDebounce(validateCode39CheckSum);
  const debouncedValidateITFCheckSum = useDebounce(validateITFCheckSum);
  const debouncedReturnCodabarStartEnd = useDebounce(returnCodabarStartEnd);
  const detect = useMemo(() => {
    debouncedWasmLocation;
    return (image: Blob) =>
      readBarcodesFromImageFile(image, {
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
        isPure: debouncedIsPure,
        returnErrors: debouncedReturnErrors,
        tryDownscale: debouncedTryDownscale,
        downscaleThreshold: debouncedDownscaleThreshold,
        downscaleFactor: debouncedDownscaleFactor,
        tryCode39ExtendedMode: debouncedTryCode39ExtendedMode,
        validateCode39CheckSum: debouncedValidateCode39CheckSum,
        validateITFCheckSum: debouncedValidateITFCheckSum,
        returnCodabarStartEnd: debouncedReturnCodabarStartEnd,
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
    debouncedReturnCodabarStartEnd,
    debouncedReturnErrors,
    debouncedTextMode,
    debouncedTryCode39ExtendedMode,
    debouncedTryDownscale,
    debouncedTryHarder,
    debouncedTryInvert,
    debouncedTryRotate,
    debouncedValidateCode39CheckSum,
    debouncedValidateITFCheckSum,
  ]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: "100vh",
        }}
      >
        <AppBar position="sticky" color="primary" enableColorOnDark>
          <Toolbar variant="dense">
            <QrCodeScanner sx={{ marginRight: 1 }} />
            <Typography
              fontWeight={700}
              variant="h6"
              component="div"
              sx={{ flexGrow: 1 }}
            >
              zxing-wasm demo
            </Typography>
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
            <IconButton
              size="small"
              aria-label="documents"
              color="inherit"
              onClick={() =>
                window.open("https://zxing-wasm.netlify.app", "_blank")
              }
            >
              <Article />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Container
          maxWidth="md"
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minWidth: 300,
            marginTop: 2,
            marginBottom: 2,
          }}
        >
          <FlexGrid container spacing={2} alignItems={"center"}>
            <FlexGrid xs={12}>
              <BarcodeImagesDropZone
                onBarcodeImagesDrop={(files) => {
                  setImages(files);
                }}
              ></BarcodeImagesDropZone>
            </FlexGrid>
            <FlexGrid xs={12} mobile={6} sm={3}>
              <FormControl sx={{ flexGrow: 1 }} size="small">
                <InputLabel id="wasm-location-label">WASM Location</InputLabel>
                <Select
                  labelId="wasm-location-label"
                  label="WASM Location"
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
            <FlexGrid xs={12} mobile={6} sm={3}>
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
                  {barcodeFormats
                    .filter((f) => f !== "None")
                    .map((barcodeFormat) => (
                      <MenuItem dense key={barcodeFormat} value={barcodeFormat}>
                        {barcodeFormat}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </FlexGrid>
            <FlexGrid xs={12} mobile={6} sm={3}>
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
            <FlexGrid xs={12} mobile={6} sm={3}>
              <FormControl sx={{ flexGrow: 1 }} size="small">
                <InputLabel id="character-set-label">Character Set</InputLabel>
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
            <FlexGrid xs={12} mobile={6} sm={3}>
              <FormControl sx={{ flexGrow: 1 }} size="small">
                <InputLabel htmlFor="max-number-of-symbols">
                  Maximum Number of Symbols
                </InputLabel>
                <OutlinedInput
                  label="Maximum Number of Symbols"
                  id="max-number-of-symbols"
                  type="number"
                  inputMode="numeric"
                  inputProps={{
                    min: 1,
                    max: 255,
                    step: 1,
                  }}
                  value={maxNumberOfSymbols}
                  onChange={handleMaxNumberOfSymbolsChange}
                ></OutlinedInput>
              </FormControl>
            </FlexGrid>
            <FlexGrid xs={12} mobile={6} sm={3}>
              <FormControl sx={{ flexGrow: 1 }} size="small">
                <InputLabel htmlFor="min-line-count">
                  Minimum Line Count
                </InputLabel>
                <OutlinedInput
                  label="Minimum Line Count"
                  id="min-line-count"
                  type="number"
                  inputMode="numeric"
                  inputProps={{
                    min: minMinLineCount,
                    step: 1,
                  }}
                  value={minLineCount}
                  onChange={handleMinLineCountChange}
                ></OutlinedInput>
              </FormControl>
            </FlexGrid>
            <FlexGrid xs={12} mobile={6} sm={3}>
              <FormControl sx={{ flexGrow: 1 }} size="small">
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
                    <MenuItem dense key={eanAddonSymbol} value={eanAddonSymbol}>
                      {eanAddonSymbol}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FlexGrid>
            <FlexGrid xs={12} mobile={6} sm={3}>
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
            <FlexGrid xs={6} mobile={4} sm={3}>
              <StyledFormControlLabel
                label="Try Harder"
                control={
                  <StyledCheckbox
                    size="small"
                    checked={tryHarder}
                    onChange={handleTryHarderChange}
                  ></StyledCheckbox>
                }
              ></StyledFormControlLabel>
            </FlexGrid>
            <FlexGrid xs={6} mobile={4} sm={3}>
              <StyledFormControlLabel
                label="Try Rotate"
                control={
                  <StyledCheckbox
                    size="small"
                    checked={tryRotate}
                    onChange={handleTryRotateChange}
                  ></StyledCheckbox>
                }
              ></StyledFormControlLabel>
            </FlexGrid>
            <FlexGrid xs={6} mobile={4} sm={3}>
              <StyledFormControlLabel
                label="Try Invert"
                control={
                  <StyledCheckbox
                    size="small"
                    checked={tryInvert}
                    onChange={handleTryInvertChange}
                  ></StyledCheckbox>
                }
              ></StyledFormControlLabel>
            </FlexGrid>
            <FlexGrid xs={6} mobile={4} sm={3}>
              <StyledFormControlLabel
                label="Is Pure"
                control={
                  <StyledCheckbox
                    size="small"
                    checked={isPure}
                    onChange={handleIsPureChange}
                  ></StyledCheckbox>
                }
              ></StyledFormControlLabel>
            </FlexGrid>
            <FlexGrid xs={6} mobile={4} sm={3}>
              <StyledFormControlLabel
                label="Return Errors"
                control={
                  <StyledCheckbox
                    size="small"
                    checked={returnErrors}
                    onChange={handleReturnErrorsChange}
                  ></StyledCheckbox>
                }
              ></StyledFormControlLabel>
            </FlexGrid>
            <FlexGrid xs={6} mobile={4} sm={3}>
              <StyledFormControlLabel
                label="Try Downscale"
                control={
                  <StyledCheckbox
                    size="small"
                    checked={tryDownscale}
                    onChange={handleTryDownscaleChange}
                  ></StyledCheckbox>
                }
              ></StyledFormControlLabel>
            </FlexGrid>
            <FlexGrid xs={6} sm={3}>
              <FormControl
                disabled={!tryDownscale}
                sx={{ flexGrow: 1 }}
                size="small"
              >
                <InputLabel htmlFor="downscale-threshold">
                  Downscale Threshold
                </InputLabel>
                <OutlinedInput
                  label="Downscale Threshold"
                  id="downscale-threshold"
                  type="number"
                  inputMode="numeric"
                  inputProps={{
                    min: minDownscaleThreshold,
                    step: 10,
                  }}
                  value={downscaleThreshold}
                  onChange={handleDownscaleThresholdChange}
                  endAdornment={
                    <InputAdornment position="end">px</InputAdornment>
                  }
                ></OutlinedInput>
              </FormControl>
            </FlexGrid>
            <FlexGrid xs={6} sm={3}>
              <FormControl
                disabled={!tryDownscale}
                sx={{ flexGrow: 1 }}
                size="small"
              >
                <InputLabel htmlFor="downscale-factor">
                  Downscale Factor
                </InputLabel>
                <OutlinedInput
                  label="Downscale Factor"
                  id="downscale-factor"
                  type="number"
                  inputMode="numeric"
                  inputProps={{
                    min: minDownscaleFactor,
                    max: maxDownscaleFactor,
                    step: 1,
                  }}
                  value={downscaleFactor}
                  onChange={handleDownscaleFactorChange}
                ></OutlinedInput>
              </FormControl>
            </FlexGrid>
            <FlexGrid xs={12} mobile={6}>
              <StyledFormControlLabel
                label="Try Code39 Extended Mode"
                control={
                  <StyledCheckbox
                    size="small"
                    checked={tryCode39ExtendedMode}
                    onChange={handleTryCode39ExtendedModeChange}
                  ></StyledCheckbox>
                }
                disabled={
                  !(
                    formats.length === 0 ||
                    formats.includes("Code39") ||
                    formats.includes("Linear-Codes")
                  )
                }
              ></StyledFormControlLabel>
            </FlexGrid>
            <FlexGrid xs={12} mobile={6}>
              <StyledFormControlLabel
                label="Validate Code39 Checksum"
                control={
                  <StyledCheckbox
                    size="small"
                    checked={validateCode39CheckSum}
                    onChange={handleValidateCode39CheckSumChange}
                  ></StyledCheckbox>
                }
                disabled={
                  !(
                    formats.length === 0 ||
                    formats.includes("Code39") ||
                    formats.includes("Linear-Codes")
                  )
                }
              ></StyledFormControlLabel>
            </FlexGrid>
            <FlexGrid xs={12} mobile={6}>
              <StyledFormControlLabel
                label="Validate ITF Checksum"
                control={
                  <StyledCheckbox
                    size="small"
                    checked={validateITFCheckSum}
                    onChange={handleValidateITFCheckSumChange}
                  ></StyledCheckbox>
                }
                disabled={
                  !(
                    formats.length === 0 ||
                    formats.includes("ITF") ||
                    formats.includes("Linear-Codes")
                  )
                }
              ></StyledFormControlLabel>
            </FlexGrid>
            <FlexGrid xs={12} mobile={6}>
              <StyledFormControlLabel
                label="Return Codabar Start End"
                control={
                  <StyledCheckbox
                    size="small"
                    checked={returnCodabarStartEnd}
                    onChange={handleReturnCodabarStartEndChange}
                  ></StyledCheckbox>
                }
                disabled={
                  !(
                    formats.length === 0 ||
                    formats.includes("Codabar") ||
                    formats.includes("Linear-Codes")
                  )
                }
              ></StyledFormControlLabel>
            </FlexGrid>
            <FlexGrid
              xs={12}
              sx={{
                justifyContent: "center",
                height: 360,
              }}
            >
              <div style={{ overflowX: "auto" }} ref={addWheelEventListener}>
                <List
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "row",
                    height: "100%",
                    paddingLeft: 1,
                    paddingRight: 1,
                  }}
                >
                  {imageObjectUrls.map((imageObjectUrl) => (
                    <BarcodeImage
                      key={imageObjectUrl}
                      src={imageObjectUrl}
                      detect={detect}
                    ></BarcodeImage>
                  ))}
                </List>
              </div>
            </FlexGrid>
          </FlexGrid>
        </Container>
        <Box>
          <Toolbar variant="dense"></Toolbar>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
