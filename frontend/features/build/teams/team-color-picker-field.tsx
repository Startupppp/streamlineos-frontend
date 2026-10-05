"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ColumnColorPicker } from "@/features/build/shared/column-color-picker";
import { DEFAULT_COLUMN_COLOR } from "@/lib/column-colors";
import { cn } from "@/lib/utils";

interface TeamColorPickerFieldProps {
  value: string;
  onChange: (color: string) => void;
}

export function TeamColorPickerField({ value, onChange }: TeamColorPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const hasColor = value.length > 0;

  function handleColorChange(color: string) {
    onChange(color);
  }

  function handleClear() {
    onChange("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-2.5 text-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            !hasColor && "text-muted-foreground",
          )}
          aria-label={hasColor ? "Change team color" : "Pick team color"}
        >
          <span
            className={cn(
              "h-4 w-4 shrink-0 rounded-full border border-border",
              !hasColor && "bg-muted",
            )}
            style={hasColor ? { backgroundColor: value } : undefined}
            aria-hidden
          />
          <span className="truncate font-mono text-xs">
            {hasColor ? value : "Pick color"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2.5" align="start">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium">Pick a color</p>
          {hasColor ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-xs text-muted-foreground"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
              Remove
            </Button>
          ) : null}
        </div>
        <ColumnColorPicker
          value={hasColor ? value : DEFAULT_COLUMN_COLOR}
          onChange={handleColorChange}
          showLabel={false}
          swatchSize="md"
        />
      </PopoverContent>
    </Popover>
  );
}
