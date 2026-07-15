"use client";

import { useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  LABEL_COLORS,
  normalizeHexColor,
  resolveLabelColor,
} from "./label-colors";

interface LabelColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  showLabel?: boolean;
  swatchSize?: "md" | "lg";
  className?: string;
}

export function LabelColorPicker({
  value,
  onChange,
  showLabel = true,
  swatchSize = "lg",
  className,
}: LabelColorPickerProps) {
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const resolvedValue = resolveLabelColor(value);
  const displayHex = hexDraft ?? resolvedValue;
  const nativeColorValue = normalizeHexColor(displayHex) ?? resolvedValue;
  const isCustomSelected = !LABEL_COLORS.some(
    (preset) => preset.toLowerCase() === resolvedValue.toLowerCase(),
  );

  const swatchClass =
    swatchSize === "lg" ? "h-7 w-7 rounded-full" : "h-6 w-6 rounded-full";

  const handleHexChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setHexDraft(event.target.value);
  }, []);

  const handleHexBlur = useCallback(() => {
    if (hexDraft == null) return;
    const normalized = normalizeHexColor(hexDraft);
    if (normalized) {
      onChange(normalized);
    }
    setHexDraft(null);
  }, [hexDraft, onChange]);

  const handleHexKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.currentTarget.blur();
      }
      if (event.key === "Escape") {
        setHexDraft(null);
        event.currentTarget.blur();
      }
    },
    [],
  );

  const handleNativeColorChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const normalized = normalizeHexColor(event.target.value);
      if (normalized) {
        onChange(normalized);
      }
      setHexDraft(null);
    },
    [onChange],
  );

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel ? (
        <Label className="text-xs text-muted-foreground">Color</Label>
      ) : null}
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="radiogroup"
        aria-label="Label color presets"
      >
        {LABEL_COLORS.map((color) => {
          const isSelected = resolvedValue.toLowerCase() === color.toLowerCase();

          function handleSelectColor() {
            onChange(color.toLowerCase());
            setHexDraft(null);
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
                "border-2 border-background shadow-sm transition-transform duration-150 ease-out",
                "hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "motion-reduce:hover:scale-100 motion-reduce:transition-none",
                isSelected
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 motion-reduce:scale-100"
                  : "ring-0",
              )}
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
      <div className="space-y-1.5 pt-1.5 border-t border-border/60">
        <Label htmlFor="label-custom-color" className="text-xs text-muted-foreground">
          Custom color
        </Label>
        <div className="flex items-center gap-2">
          <input
            id="label-custom-color"
            type="color"
            value={nativeColorValue}
            onChange={handleNativeColorChange}
            aria-label="Pick custom label color"
            className={cn(
              "h-8 w-8 shrink-0 cursor-pointer rounded-md border border-input bg-card p-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isCustomSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
          />
          <Input
            value={displayHex}
            onChange={handleHexChange}
            onBlur={handleHexBlur}
            onKeyDown={handleHexKeyDown}
            placeholder="#6366f1"
            className="h-8 flex-1 font-mono text-xs"
            maxLength={7}
            spellCheck={false}
            aria-label="Hex color value"
          />
          <span
            className="h-6 w-6 shrink-0 rounded-full border border-border shadow-sm"
            style={{ backgroundColor: nativeColorValue }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
