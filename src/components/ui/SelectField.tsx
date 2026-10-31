import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export type SelectFieldProps = {
  value: string;
  id: string;
  label: string;
  items: { value: string; label: string; detail?: string }[];
  onValueChange: (value: string) => void;
};

export function SelectField({
  value,
  id,
  label,
  items,
  onValueChange,
}: SelectFieldProps) {
  return (
    <Select
      value={value}
      items={items}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
    >
      <SelectTrigger id={id} aria-label={label} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            data-value={item.value}
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
