"use client";

import { useCallback, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


interface ChipControlProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function parse(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function ChipControl({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: ChipControlProps) {
  const chips = parse(value);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = useCallback(
    (next: string[]) => onChange(next.join(", ")),
    [onChange],
  );

  const addChip = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed && !chips.includes(trimmed)) commit([...chips, trimmed]);
      setDraft("");
    },
    [chips, commit],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        addChip(draft);
        return;
      }
      if (event.key === "Backspace" && draft === "" && chips.length > 0)
        commit(chips.slice(0, -1));
    },
    [addChip, chips, commit, draft],
  );

  const handleBlur = useCallback(() => {
    if (draft.trim()) addChip(draft);
  }, [addChip, draft]);

  const handleContainerClick = useCallback(() => inputRef.current?.focus(), []);

  const handleDraftChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setDraft(event.target.value),
    [],
  );

  const handleRemove = useCallback(
    (chip: string) => commit(chips.filter((candidate) => candidate !== chip)),
    [chips, commit],
  );

  return (
    <div
      onClick={handleContainerClick}
      className={cn(
        "flex min-h-9 w-full cursor-text flex-wrap items-center gap-gap-inline rounded-md border border-input bg-background px-2 py-1.5 text-sm",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      {chips.map((chip) => (
        <ChipBadge key={chip} chip={chip} onRemove={handleRemove} />
      ))}
      <input
        ref={inputRef}
        value={draft}
        onChange={handleDraftChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={chips.length === 0 ? placeholder : undefined}
        className="min-w-20 flex-1 bg-transparent text-dense outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

function ChipBadge({ chip, onRemove }: { chip: string; onRemove: (chip: string) => void }) {
  const handleClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      onRemove(chip);
    },
    [chip, onRemove],
  );

  return (
    <Badge variant="secondary" className="h-5 shrink-0 gap-0.5 px-1.5 text-micro">
      {chip}
      <button
        type="button"
        aria-label={`Remove ${chip}`}
        onClick={handleClick}
        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </Badge>
  );
}
