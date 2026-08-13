import { Input } from "./Input";
import { Label } from "./Label";

export interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;

/** Sélecteur de couleur natif + saisie hexadécimale directe. */
export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={HEX_COLOR_REGEX.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-md border border-border p-0.5"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#0B1F44"
          className="w-32"
        />
      </div>
    </div>
  );
}
