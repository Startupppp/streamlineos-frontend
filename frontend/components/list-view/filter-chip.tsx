"use client";

import type { MouseEvent } from "react";
import { XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";

export interface FilterChipProps {
  label: string;
  color?: string;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ label, color, onRemove, className }: FilterChipProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleRemoveClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onRemove();
  }

  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-[12rem] items-center gap-1 rounded-md border border-border/80 bg-card px-1.5 text-xs text-foreground shadow-sm",
        className,
      )}
    >
      {color ? (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      <span className="min-w-0 truncate font-medium leading-none">{label}</span>
      <button
        type="button"
        onClick={handleRemoveClick}
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
        aria-label={`Remove ${label} filter`}
        {...hoverHandlers}
      >
        <XIcon ref={iconRef} size={10} />
      </button>
    </span>
  );
}
