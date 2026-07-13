"use client";

import { useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  COLUMN_COLORS,
  normalizeHexColor,
  resolveColumnColor,
} from "./column-colors";

interface ColumnColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  showLabel?: boolean;
  swatchSize?: "md" | "lg";
}

export function ColumnColorPicker({
  value,
  onChange,
  showLabel = true,
  swatchSize = "md",
}: ColumnColorPickerProps) {
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const resolvedValue = resolveColumnColor(value);
  const displayHex = hexDraft ?? resolvedValue;
  const nativeColorValue = normalizeHexColor(displayHex) ?? resolvedValue;

  const swatchClass =
    swatchSize === "lg"
      ? "h-7 w-7 rounded-full"
      : "h-5 w-5 rounded-full";

  const handleHexChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setHexDraft(e.target.value);
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
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
      if (e.key === "Escape") {
        setHexDraft(null);
        e.currentTarget.blur();
      }
    },
    [],
  );

  const handleNativeColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const normalized = normalizeHexColor(e.target.value);
      if (normalized) {
        onChange(normalized);
      }
      setHexDraft(null);
    },
    [onChange],
  );

  return (
    <div className="space-y-2">
      {showLabel ? (
        <Label className="text-xs text-muted-foreground">Color</Label>
      ) : null}
      <div
        className="grid grid-cols-6 gap-1.5"
        role="radiogroup"
        aria-label="Column color presets"
      >
        {COLUMN_COLORS.map((color) => {
          const isSelected = resolvedValue.toLowerCase() === color.toLowerCase();

          function handleSelectColor() {
            onChange(color);
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
                "border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-foreground scale-110"
                  : "border-transparent",
              )}
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
      <div className="space-y-1.5 pt-1 border-t border-border/60">
        <Label className="text-xs text-muted-foreground">Custom</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={nativeColorValue}
            onChange={handleNativeColorChange}
            aria-label="Pick custom color"
            className="h-8 w-8 shrink-0 cursor-pointer rounded border border-input bg-card p-0.5"
          />
          <Input
            value={displayHex}
            onChange={handleHexChange}
            onBlur={handleHexBlur}
            onKeyDown={handleHexKeyDown}
            placeholder="#3b82f6"
            className="h-8 flex-1 font-mono text-xs"
            maxLength={7}
            spellCheck={false}
            aria-label="Hex color value"
          />
        </div>
      </div>
    </div>
  );
}
