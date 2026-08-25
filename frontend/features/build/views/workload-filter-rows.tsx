"use client";

import { ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryRowProps {
  icon: React.ReactNode;
  label: string;
  activeCount: number;
  hovered: boolean;
  onMouseEnter: () => void;
  onFocus: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function CategoryRow({
  icon,
  label,
  activeCount,
  hovered,
  onMouseEnter,
  onFocus,
  onKeyDown,
}: CategoryRowProps) {
  return (
    <div
      role="menuitem"
      tabIndex={0}
      aria-haspopup="true"
      aria-expanded={hovered}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className={cn(
        "flex h-9 cursor-default select-none items-center gap-2.5 rounded-md px-3 text-sm outline-none transition-colors motion-reduce:transition-none",
        hovered
          ? "bg-primary/10 text-foreground"
          : "text-foreground/90 hover:bg-muted/70 focus-visible:bg-primary/10",
      )}
    >
      <span className="shrink-0 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium tracking-tight">
        {label}
      </span>
      {activeCount > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-dense font-semibold text-primary-foreground">
          {activeCount}
        </span>
      ) : null}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
  );
}

interface OptionRowProps {
  active: boolean;
  label: string;
  leading?: React.ReactNode;
  color?: string | null;
  onClick: () => void;
}

export function OptionRow({ active, label, leading, color, onClick }: OptionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none motion-reduce:transition-none"
    >
      <Check
        className={cn(
          "h-4 w-4 shrink-0 transition-opacity motion-reduce:transition-none",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      {leading}
      {!leading && color ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
    </button>
  );
}
