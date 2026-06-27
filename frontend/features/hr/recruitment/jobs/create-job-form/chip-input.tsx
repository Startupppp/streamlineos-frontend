"use client";

import { useState, useCallback, KeyboardEvent, ChangeEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 rounded-lg border border-input bg-background px-3 py-2 min-h-[40px]",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0 transition-colors duration-200",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {value.map((chip) => (
        <span
          key={chip}
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800"
        >
          {chip}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeChip(chip)}
              className="rounded-full hover:bg-violet-200 dark:hover:bg-violet-800 p-0.5 transition-colors duration-200 cursor-pointer"
              aria-label={`Remove ${chip}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </span>
      ))}
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ""}
        disabled={disabled}
        className="border-0 shadow-none p-0 h-6 flex-1 min-w-[120px] focus-visible:ring-0 text-sm bg-transparent"
      />
    </div>
  );
}
