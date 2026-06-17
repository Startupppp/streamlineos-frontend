"use client";

import { useState, useCallback, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ChipInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChipInput({ value, onChange, placeholder = "Type and press Enter", disabled }: ChipInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
        e.preventDefault();
        const chip = inputValue.trim().replace(/,$/, "");
        if (chip && !value.includes(chip)) {
          onChange([...value, chip]);
        }
        setInputValue("");
      } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
        onChange(value.slice(0, -1));
      }
    },
    [inputValue, value, onChange]
  );

  const removeChip = useCallback(
    (chip: string) => {
      onChange(value.filter((v) => v !== chip));
    },
    [value, onChange]
  );

  return (
    <div className="flex flex-wrap gap-1.5 rounded-md border bg-background px-3 py-2 min-h-[40px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
      {value.map((chip) => (
        <Badge key={chip} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 h-6 text-xs font-normal">
          {chip}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeChip(chip)}
              className="rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
              aria-label={`Remove ${chip}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </Badge>
      ))}
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ""}
        disabled={disabled}
        className="border-0 shadow-none p-0 h-6 flex-1 min-w-[120px] focus-visible:ring-0 text-sm"
      />
    </div>
  );
}
