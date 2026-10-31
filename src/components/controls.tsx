import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Checkbox } from "./ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Input } from "./ui/input";
import { SelectField } from "./ui/SelectField";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

export function Check({
  label,
  checked,
  onChange,
  title,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  title?: string;
}) {
  return (
    <label className="check-field" title={title}>
      <Checkbox checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}
export function Choice({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string;
  choices: { value: string; label: ReactNode }[];
  onChange: (value: string) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(value) => onChange(String(value))}>
      <TabsList aria-label={label}>
        {choices.map((choice) => (
          <TabsTrigger key={choice.value} value={choice.value}>
            {choice.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
export function Disclosure({
  title,
  children,
  open,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <Collapsible defaultOpen={open}>
      <CollapsibleTrigger className="disclosure-trigger">
        {title}
        <ChevronDown size={14} />
      </CollapsibleTrigger>
      <CollapsibleContent className="disclosure-content">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      {label}
      <Input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => {
          const value = event.target.valueAsNumber;
          if (Number.isInteger(value) && value >= min && value <= max)
            onChange(value);
        }}
      />
    </label>
  );
}
export function SelectOption({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <SelectField
        id={label.replaceAll(" ", "-")}
        label={label}
        value={value}
        items={values.map((value) => ({ value, label: value }))}
        onValueChange={onChange}
      />
    </Field>
  );
}
