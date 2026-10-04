"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterChipProps {
  label: string;
  value: string;
  onRemove?: () => void;
  error?: boolean;
  errorMessage?: string;
  className?: string;
}

export function FilterChip({
  label,
  value,
  onRemove,
  error = false,
  errorMessage,
  className,
}: FilterChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        error
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border bg-secondary text-secondary-foreground",
        className,
      )}
      role="status"
      aria-label={
        error
          ? (errorMessage ?? `Filter error: ${label}`)
          : `Filter: ${label} is ${value}`
      }
    >
      <span className="shrink-0 font-normal text-muted-foreground">{label}</span>
      <span className="shrink-0 font-semibold">{value}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove filter: ${label} is ${value}`}
          className="ml-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={onRemove}
        >
          <X className="h-2.5 w-2.5" aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
