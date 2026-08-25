"use client";

import { useCallback, useRef, useState, useId } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

interface EmailChipsInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  id?: string;
  "aria-describedby"?: string;
}

export function EmailChipsInput({
  value,
  onChange,
  placeholder = "Add email...",
  disabled = false,
  hasError = false,
  id,
  "aria-describedby": ariaDescribedBy,
}: EmailChipsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const addEmail = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      if (!isValidEmail(trimmed)) {
        setInputError(true);
        return;
      }
      if (value.includes(trimmed)) {
        setInputValue("");
        setInputError(false);
        return;
      }
      onChange([...value, trimmed]);
      setInputValue("");
      setInputError(false);
    },
    [value, onChange],
  );

  const removeEmail = useCallback(
    (email: string) => {
      onChange(value.filter((e) => e !== email));
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addEmail(inputValue);
        return;
      }
      if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
        removeEmail(value[value.length - 1] ?? "");
      }
      if (inputError) setInputError(false);
    },
    [inputValue, value, addEmail, removeEmail, inputError],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      if (inputError) setInputError(false);
    },
    [inputError],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData("text");
      const parts = pasted.split(/[,;\s]+/).filter(Boolean);
      if (parts.length > 1) {
        e.preventDefault();
        const valid = parts
          .filter(isValidEmail)
          .filter((email) => !value.includes(email));
        if (valid.length > 0) {
          onChange([...value, ...valid]);
        }
        setInputValue("");
        return;
      }
    },
    [value, onChange],
  );

  const handleBlur = useCallback(() => {
    if (inputValue.trim()) {
      addEmail(inputValue);
    }
  }, [inputValue, addEmail]);

  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 items-center px-2 py-1.5 rounded-md border bg-card min-h-[36px] cursor-text transition-colors",
        hasError || inputError
          ? "border-destructive ring-1 ring-destructive"
          : "border-input focus-within:ring-1 focus-within:ring-ring",
        disabled && "opacity-50 cursor-not-allowed",
      )}
      onClick={handleContainerClick}
      role="group"
    >
      {value.map((email) => (
        <span
          key={email}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-dense font-medium text-foreground/80 border border-border/60"
        >
          <span className="max-w-[160px] truncate">{email}</span>
          {!disabled && (
            <button
              type="button"
              className="flex-none text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                removeEmail(email);
              }}
              aria-label={`Remove ${email}`}
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        className="flex-1 min-w-[120px] bg-transparent text-label outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : ""}
        disabled={disabled}
        aria-describedby={ariaDescribedBy}
        autoComplete="off"
      />
    </div>
  );
}
