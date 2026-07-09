"use client";

import { X } from "lucide-react";
import { Label } from "@/components/ui/label";

export interface FilterChipProps {
  label: string;
  color?: string;
  onRemove: () => void;
}

export function FilterChip({ label, color, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-full border border-border bg-card pl-1.5 pr-1 text-[10px] text-foreground">
      {color && (
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

export interface FilterSectionProps {
  label: string;
  children: React.ReactNode;
}

export function FilterSection({ label, children }: FilterSectionProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
