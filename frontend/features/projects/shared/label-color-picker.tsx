"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LABEL_COLORS } from "./label-colors";

interface LabelColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  showLabel?: boolean;
  swatchSize?: "md" | "lg";
}

export function LabelColorPicker({
  value,
  onChange,
  showLabel = true,
  swatchSize = "lg",
}: LabelColorPickerProps) {
  const swatchClass =
    swatchSize === "lg"
      ? "h-8 w-8 rounded-full"
      : "h-5 w-5 rounded-full";

  return (
    <div className="space-y-2">
      {showLabel ? (
        <Label className="text-xs text-muted-foreground">Color</Label>
      ) : null}
      <div
        className="grid grid-cols-4 gap-2"
        role="radiogroup"
        aria-label="Label color"
      >
        {LABEL_COLORS.map((color) => {
          const isSelected = value === color;

          function handleSelectColor() {
            onChange(color);
          }

          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Select color ${color}`}
              onClick={handleSelectColor}
              className={cn(
                swatchClass,
                "border-2 border-white shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "ring-2 ring-foreground ring-offset-2 scale-105"
                  : "ring-0",
              )}
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
    </div>
  );
}
