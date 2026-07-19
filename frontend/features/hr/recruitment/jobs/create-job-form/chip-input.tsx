"use client";

import { useState, useCallback, KeyboardEvent, ChangeEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChipTagProps {
  chip: string;
  disabled?: boolean;
  onRemove: (chip: string) => void;
}

function ChipTag({ chip, disabled, onRemove }: ChipTagProps) {
  function handleClick() { onRemove(chip); }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800">
      {chip}
      {!disabled && (
        <button
          type="button"
          onClick={handleClick}
          className="rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 p-0.5 transition-colors duration-200 cursor-pointer"
          aria-label={`Remove ${chip}`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

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
        <ChipTag key={chip} chip={chip} disabled={disabled} onRemove={removeChip} />
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
