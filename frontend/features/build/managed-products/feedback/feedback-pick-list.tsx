"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface FeedbackPickItemProps {
  id: number;
  label: string;
  meta?: string | null;
  selected: boolean;
  onSelect: (id: number) => void;
}

function FeedbackPickItem({ id, label, meta, selected, onSelect }: FeedbackPickItemProps) {
  const handleClick = useCallback(() => onSelect(id), [id, onSelect]);
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={handleClick}
      className={cn(
        "flex min-h-9 w-full flex-col gap-0.5 rounded-md border px-3 py-2 text-left text-sm transition-colors",
        selected
          ? "border-primary bg-accent text-foreground"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      <span className="line-clamp-2 text-pretty">{label}</span>
      {meta ? <span className="text-micro text-muted-foreground">{meta}</span> : null}
    </button>
  );
}

interface FeedbackPickListProps<T> {
  items: readonly T[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  getId: (item: T) => number;
  getLabel: (item: T) => string;
  getMeta?: (item: T) => string | null | undefined;
  isLoading?: boolean;
  loadingText: string;
  emptyText: string;
  label: string;
}

export function FeedbackPickList<T>({
  items,
  selectedId,
  onSelect,
  getId,
  getLabel,
  getMeta,
  isLoading,
  loadingText,
  emptyText,
  label,
}: FeedbackPickListProps<T>) {
  return (
    <div
      role="listbox"
      aria-label={label}
      className="flex max-h-64 flex-col gap-1 overflow-y-auto"
    >
      {isLoading ? (
        <p className="py-2 text-sm text-muted-foreground">{loadingText}</p>
      ) : items.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        items.map((item) => {
          const id = getId(item);
          return (
            <FeedbackPickItem
              key={id}
              id={id}
              label={getLabel(item)}
              meta={getMeta?.(item)}
              selected={selectedId === id}
              onSelect={onSelect}
            />
          );
        })
      )}
    </div>
  );
}
