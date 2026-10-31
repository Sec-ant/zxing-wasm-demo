import { memo } from "react";
import {
  BINARIZERS,
  CHARACTER_SETS,
  defaultReaderOptions,
  EAN_ADD_ON_SYMBOLS,
  formatToLabel,
  READABLE_BARCODE_FORMATS,
  type ReaderOptions,
  TEXT_MODES,
} from "zxing-wasm";
import { Check, Disclosure, NumberField, SelectOption } from "./controls";
import { Button } from "./ui/button";
import { SelectField } from "./ui/SelectField";

type Options = Required<ReaderOptions>;
export const ReaderOptionsPanel = memo(function ReaderOptionsPanel({
  options,
  onChange,
}: {
  options: Options;
  onChange: (options: Options) => void;
}) {
  function patch<K extends keyof Options>(key: K, value: Options[K]) {
    onChange({ ...options, [key]: value });
  }
  return (
    <section
      className="inspector-section settings-section"
      aria-label="Reader settings"
    >
      <div className="section-heading">
        <h2>Reader settings</h2>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onChange({ ...defaultReaderOptions, formats: [] })}
        >
          Reset
        </Button>
      </div>
      <div className="field">
        <label htmlFor="read-family">Symbol family</label>
        <SelectField
          id="read-family"
          label="Symbol family"
          value={
            options.formats.length === 0
              ? "auto"
              : options.formats.length === 1
                ? options.formats[0]
                : "custom"
          }
          items={[
            { value: "auto", label: "Auto · all formats" },
            { value: "custom", label: "Custom selection" },
            ...READABLE_BARCODE_FORMATS.map((value) => ({
              value,
              label: formatToLabel(value)!,
            })),
          ]}
          onValueChange={(value) =>
            patch(
              "formats",
              value === "auto"
                ? []
                : value === "custom"
                  ? ["QRCode", "DataMatrix"]
                  : [value as Options["formats"][number]],
            )
          }
        />
      </div>
      <Disclosure
        title={`Format selection${options.formats.length ? ` · ${options.formats.length}` : ""}`}
      >
        <div className="format-checks">
          {READABLE_BARCODE_FORMATS.map((format) => (
            <Check
              key={format}
              label={formatToLabel(format)!}
              checked={options.formats.includes(format)}
              onChange={(checked) =>
                patch(
                  "formats",
                  checked
                    ? [...options.formats, format]
                    : options.formats.filter((f) => f !== format),
                )
              }
            />
          ))}
        </div>
      </Disclosure>
      <div className="check-list">
        {(
          [
            ["tryHarder", "Try harder"],
            ["tryRotate", "Try rotated"],
            ["tryInvert", "Try inverted"],
            ["tryDownscale", "Try downscale"],
          ] as const
        ).map(([key, label]) => (
          <Check
            key={key}
            label={label}
            checked={options[key]}
            onChange={(value) => patch(key, value)}
          />
        ))}
      </div>
      <Disclosure title="Advanced options">
        <SelectOption
          label="Binarizer"
          value={options.binarizer}
          values={BINARIZERS}
          onChange={(value) =>
            patch("binarizer", value as Options["binarizer"])
          }
        />
        <SelectOption
          label="Text mode"
          value={options.textMode}
          values={TEXT_MODES}
          onChange={(value) => patch("textMode", value as Options["textMode"])}
        />
        <SelectOption
          label="Character set"
          value={options.characterSet}
          values={CHARACTER_SETS}
          onChange={(value) =>
            patch("characterSet", value as Options["characterSet"])
          }
        />
        <SelectOption
          label="EAN add-on"
          value={options.eanAddOnSymbol}
          values={EAN_ADD_ON_SYMBOLS}
          onChange={(value) =>
            patch("eanAddOnSymbol", value as Options["eanAddOnSymbol"])
          }
        />
        <NumberField
          label="Downscale threshold"
          value={options.downscaleThreshold}
          min={0}
          max={65535}
          onChange={(value) => patch("downscaleThreshold", value)}
        />
        <NumberField
          label="Downscale factor"
          value={options.downscaleFactor}
          min={2}
          max={4}
          onChange={(value) => patch("downscaleFactor", value)}
        />
        <NumberField
          label="Minimum line count"
          value={options.minLineCount}
          min={1}
          max={255}
          onChange={(value) => patch("minLineCount", value)}
        />
        <NumberField
          label="Maximum symbols · 0 is unlimited"
          value={options.maxNumberOfSymbols}
          min={0}
          max={255}
          onChange={(value) => patch("maxNumberOfSymbols", value)}
        />
        <Check
          label="Pure barcode"
          checked={options.isPure}
          onChange={(value) => patch("isPure", value)}
        />
        <Check
          label="Try denoise"
          checked={options.tryDenoise}
          onChange={(value) => patch("tryDenoise", value)}
        />
        <Check
          label="Validate optional checksum"
          checked={options.validateOptionalChecksum}
          onChange={(value) => patch("validateOptionalChecksum", value)}
        />
        <Check
          label="Return errors"
          checked={options.returnErrors}
          onChange={(value) => patch("returnErrors", value)}
        />
      </Disclosure>
    </section>
  );
});
