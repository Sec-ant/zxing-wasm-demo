import {
  Container,
  CssBaseline,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  OutlinedInput,
  Select,
  Switch,
  SwitchProps,
  ThemeProvider,
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
  type ChangeEventHandler,
} from "react";
import * as z from "zod";
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
  setZXingModuleOverrides,
  textModes,
  type Binarizer,
  type CharacterSet,
  type DecodeHints,
  type EanAddOnSymbol,
  type ReadInputBarcodeFormat,
  type TextMode,
} from "zxing-wasm/reader";

import { resolveCDNUrl, supportedCDNs } from "./cdn";
import BarcodeImagesDropZone from "./components/BarcodeImagesDropZone";

const wasmLocations = ["local", ...supportedCDNs] as const;
type WasmLocation = (typeof wasmLocations)[number];

function resolveWasmUrl(wasmLocation: WasmLocation) {
  if (wasmLocation === "local") {
    return "/zxing_reader.wasm";
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
}));

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
   * Module Overrides
   */
  useEffect(() => {
    const unsubZXingWasmLocation = useZXingWasmDemoStore.subscribe(
      (state) => state.wasmLocation,
      (wasmLocation) => {
        setZXingModuleOverrides({
          locateFile: (path, prefix) =>
            path.endsWith(".wasm")
              ? resolveWasmUrl(wasmLocation)
              : prefix + path,
        });
      },
    );
    return () => {
      unsubZXingWasmLocation();
    };
  }, []);

  /**
   * WASM Location
   */
  const wasmLocationSchema = useCallback(
    (d: WasmLocation) => z.enum(wasmLocations).catch(d),
    [],
  );
  const { wasmLocation } = useZXingWasmDemoStore();
  const handleWasmLocationTypeChange = useCallback<
    Exclude<SelectProps<WasmLocation>["onChange"], undefined>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ wasmLocation }) => ({
        wasmLocation: wasmLocationSchema(wasmLocation).parse(value),
      }));
    },
    [wasmLocationSchema],
  );

  /**
   * Formats
   */
  const formatsSchema = useCallback(
    (d: ReadInputBarcodeFormat[]) =>
      z
        .array(z.enum(barcodeFormats))
        .transform((formats) => {
          return [...new Set(formats)].filter(
            (f) => f !== "None",
          ) as ReadInputBarcodeFormat[];
        })
        .catch(d),
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
        formats: [...formatsSchema(formats).parse(value)],
      }));
    },
    [formatsSchema],
  );

  /**
   * Binarizer
   */
  const binarizerSchema = useCallback(
    (d: Binarizer) => z.enum(binarizers).catch(d),
    [],
  );
  const { binarizer } = useZXingWasmDemoStore();
  const handleBinarizerChange = useCallback<
    Exclude<SelectProps<Binarizer>["onChange"], undefined>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ binarizer }) => ({
        binarizer: binarizerSchema(binarizer).parse(value),
      }));
    },
    [binarizerSchema],
  );

  /**
   * Try Harder
   */
  const { tryHarder } = useZXingWasmDemoStore();
  const handleTryHarderChange = useCallback<
    Exclude<SwitchProps["onChange"], undefined>
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
    Exclude<SwitchProps["onChange"], undefined>
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
    Exclude<SwitchProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      tryInvert: checked,
    });
  }, []);

  /**
   * Try Downscale
   */
  const { tryDownscale } = useZXingWasmDemoStore();
  const handleTryDownscaleChange = useCallback<
    Exclude<SwitchProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      tryDownscale: checked,
    });
  }, []);

  /**
   * Is Pure
   */
  const { isPure } = useZXingWasmDemoStore();
  const handleIsPureChange = useCallback<
    Exclude<SwitchProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      isPure: checked,
    });
  }, []);

  /**
   * Downscale Threshold
   */
  const minDownscaleThreshold = 0;
  const downscaleThresholdSchema = useCallback(
    (d: number) =>
      z
        .string()
        .transform((v) => parseInt(v, 10))
        .pipe(
          z
            .number()
            .int()
            .finite()
            .positive()
            .min(minDownscaleThreshold)
            .catch(d),
        ),
    [],
  );
  const { downscaleThreshold } = useZXingWasmDemoStore();
  const handleDownscaleThresholdChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ downscaleThreshold }) => ({
        downscaleThreshold:
          downscaleThresholdSchema(downscaleThreshold).parse(value),
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
      z
        .string()
        .transform((v) => parseInt(v, 10))
        .pipe(
          z
            .number()
            .int()
            .min(minDownscaleFactor)
            .max(maxDownscaleFactor)
            .catch(d),
        ),
    [],
  );
  const { downscaleFactor } = useZXingWasmDemoStore();
  const handleDownscaleFactorChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ downscaleFactor }) => ({
        downscaleFactor: downscaleFactorSchema(downscaleFactor).parse(value),
      }));
    },
    [downscaleFactorSchema],
  );

  /**
   * Minimum Line Count
   */
  const minMinLineCount = 1;
  const minLineCountSchema = useCallback(
    (d: number) =>
      z
        .string()
        .transform((v) => parseInt(v, 10))
        .pipe(z.number().int().min(minMinLineCount).catch(d)),
    [],
  );
  const { minLineCount } = useZXingWasmDemoStore();
  const handleMinLineCountChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ minLineCount }) => ({
        minLineCount: minLineCountSchema(minLineCount).parse(value),
      }));
    },
    [minLineCountSchema],
  );

  /**
   * Maximum Number of Symbols
   */
  const minMaxNumberOfSymbols = 1;
  const maxMaxNumberOfSymbols = 255;
  const maxNumberOfSymbolsSchema = useCallback(
    (d: number) =>
      z
        .string()
        .transform((v) => parseInt(v, 10))
        .pipe(
          z
            .number()
            .int()
            .min(minMaxNumberOfSymbols)
            .max(maxMaxNumberOfSymbols)
            .catch(d),
        ),
    [],
  );
  const { maxNumberOfSymbols } = useZXingWasmDemoStore();
  const handleMaxNumberOfSymbolsChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ maxNumberOfSymbols }) => ({
        maxNumberOfSymbols:
          maxNumberOfSymbolsSchema(maxNumberOfSymbols).parse(value),
      }));
    },
    [maxNumberOfSymbolsSchema],
  );

  /**
   * Try Code39 Extended Mode
   */
  const { tryCode39ExtendedMode } = useZXingWasmDemoStore();
  const handleTryCode39ExtendedModeChange = useCallback<
    Exclude<SwitchProps["onChange"], undefined>
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
    Exclude<SwitchProps["onChange"], undefined>
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
    Exclude<SwitchProps["onChange"], undefined>
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
    Exclude<SwitchProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      returnCodabarStartEnd: checked,
    });
  }, []);

  /**
   * Return Errors
   */
  const { returnErrors } = useZXingWasmDemoStore();
  const handleReturnErrorsChange = useCallback<
    Exclude<SwitchProps["onChange"], undefined>
  >((_, checked) => {
    useZXingWasmDemoStore.setState({
      returnErrors: checked,
    });
  }, []);

  /**
   * EAN Addon Symbol
   */
  const eanAddOnSymbolSchema = useCallback(
    (d: EanAddOnSymbol) => z.enum(eanAddOnSymbols).catch(d),
    [],
  );
  const { eanAddOnSymbol } = useZXingWasmDemoStore();
  const handleEanAddonSymbolChange = useCallback<
    Exclude<SelectProps<EanAddOnSymbol>["onChange"], undefined>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ eanAddOnSymbol }) => ({
        eanAddOnSymbol: eanAddOnSymbolSchema(eanAddOnSymbol).parse(value),
      }));
    },
    [eanAddOnSymbolSchema],
  );

  /**
   * Text Mode
   */
  const textModeSchema = useCallback(
    (d: TextMode) => z.enum(textModes).catch(d),
    [],
  );
  const { textMode } = useZXingWasmDemoStore();
  const handleTextModeChange = useCallback<
    Exclude<SelectProps<TextMode>["onChange"], undefined>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ textMode }) => ({
        textMode: textModeSchema(textMode).parse(value),
      }));
    },
    [textModeSchema],
  );

  /**
   * Character Set
   */
  const characterSetSchema = useCallback(
    (d: CharacterSet) => z.enum(characterSets).catch(d),
    [],
  );
  const { characterSet } = useZXingWasmDemoStore();
  const handleCharacterSetChange = useCallback<
    Exclude<SelectProps<CharacterSet>["onChange"], undefined>
  >(
    ({ target: { value } }) => {
      useZXingWasmDemoStore.setState(({ characterSet }) => ({
        characterSet: characterSetSchema(characterSet).parse(value),
      }));
    },
    [characterSetSchema],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container
        maxWidth="md"
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 0,
          minWidth: 300,
        }}
      >
        <h1>ZXing WASM Demo</h1>
        <Typography
          fontFamily="MonaspaceArgon"
          variant="subtitle2"
          gutterBottom
        >
          <Link
            href={`https://github.com/Sec-ant/zxing-wasm/tree/v${ZXING_WASM_VERSION}`}
          >
            zxing-wasm@{ZXING_WASM_VERSION}
          </Link>
        </Typography>
        <FlexGrid container spacing={2} alignItems={"center"}>
          <FlexGrid xs={12}>
            <BarcodeImagesDropZone
              onBarcodeImagesDrop={(files) => {
                console.log(files);
              }}
            ></BarcodeImagesDropZone>
          </FlexGrid>
          <FlexGrid xs={6}>
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
          <FlexGrid xs={6}>
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
          <FlexGrid xs={6}>
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
          <FlexGrid xs={6}>
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
          <FlexGrid xs={6}>
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
          <FlexGrid xs={6}>
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
          <FlexGrid xs={6}>
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
          <FlexGrid xs={6}>
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
          <FlexGrid xs={3}>
            <StyledFormControlLabel
              label="Try Harder"
              sx={{ flexGrow: 1, userSelect: "none" }}
              control={
                <Switch
                  size="small"
                  checked={tryHarder}
                  onChange={handleTryHarderChange}
                ></Switch>
              }
            ></StyledFormControlLabel>
          </FlexGrid>
          <FlexGrid xs={3}>
            <StyledFormControlLabel
              label="Try Rotate"
              sx={{ flexGrow: 1, userSelect: "none" }}
              control={
                <Switch
                  size="small"
                  checked={tryRotate}
                  onChange={handleTryRotateChange}
                ></Switch>
              }
            ></StyledFormControlLabel>
          </FlexGrid>
          <FlexGrid xs={3}>
            <StyledFormControlLabel
              label="Try Invert"
              sx={{ flexGrow: 1, userSelect: "none" }}
              control={
                <Switch
                  size="small"
                  checked={tryInvert}
                  onChange={handleTryInvertChange}
                ></Switch>
              }
            ></StyledFormControlLabel>
          </FlexGrid>
          <FlexGrid xs={3}>
            <StyledFormControlLabel
              label="Is Pure"
              sx={{ flexGrow: 1, userSelect: "none" }}
              control={
                <Switch
                  size="small"
                  checked={isPure}
                  onChange={handleIsPureChange}
                ></Switch>
              }
            ></StyledFormControlLabel>
          </FlexGrid>
          <FlexGrid xs={3}>
            <StyledFormControlLabel
              label="Return Errors"
              sx={{ flexGrow: 1, userSelect: "none" }}
              control={
                <Switch
                  size="small"
                  checked={returnErrors}
                  onChange={handleReturnErrorsChange}
                ></Switch>
              }
            ></StyledFormControlLabel>
          </FlexGrid>
          <FlexGrid xs={3}>
            <StyledFormControlLabel
              label="Try Downscale"
              sx={{ flexGrow: 1, userSelect: "none" }}
              control={
                <Switch
                  size="small"
                  checked={tryDownscale}
                  onChange={handleTryDownscaleChange}
                ></Switch>
              }
            ></StyledFormControlLabel>
          </FlexGrid>
          <FlexGrid xs={3}>
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
          <FlexGrid xs={3}>
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
          <FlexGrid xs={6}>
            <StyledFormControlLabel
              label="Try Code39 Extended Mode"
              sx={{ flexGrow: 1, userSelect: "none" }}
              control={
                <Switch
                  size="small"
                  checked={tryCode39ExtendedMode}
                  onChange={handleTryCode39ExtendedModeChange}
                ></Switch>
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
          <FlexGrid xs={6}>
            <StyledFormControlLabel
              label="Validate Code39 Checksum"
              sx={{ flexGrow: 1, userSelect: "none" }}
              control={
                <Switch
                  size="small"
                  checked={validateCode39CheckSum}
                  onChange={handleValidateCode39CheckSumChange}
                ></Switch>
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
          <FlexGrid xs={6}>
            <StyledFormControlLabel
              label="Validate ITF Checksum"
              sx={{ flexGrow: 1, userSelect: "none" }}
              control={
                <Switch
                  size="small"
                  checked={validateITFCheckSum}
                  onChange={handleValidateITFCheckSumChange}
                ></Switch>
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
          <FlexGrid xs={6}>
            <StyledFormControlLabel
              label="Return Codabar Start End"
              sx={{ flexGrow: 1, userSelect: "none" }}
              control={
                <Switch
                  size="small"
                  checked={returnCodabarStartEnd}
                  onChange={handleReturnCodabarStartEndChange}
                ></Switch>
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
        </FlexGrid>
      </Container>
    </ThemeProvider>
  );
};

export default App;
