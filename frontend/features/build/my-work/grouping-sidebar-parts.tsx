"use client";

import { memo, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface GroupRow {
  key: string;
  label: string;
  count: number;
  color?: string | null;
}

interface SidebarRowProps {
  row: GroupRow;
  isActive: boolean;
  onToggle: (key: string) => void;
  leading?: ReactNode;
}

export const SidebarRow = memo(function SidebarRow({
  row,
  isActive,
  onToggle,
  leading,
}: SidebarRowProps) {
  function handleClick() {
    onToggle(row.key);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
        isActive
          ? "bg-foreground text-background shadow-sm"
          : "text-foreground hover:bg-muted/60",
      )}
    >
      {leading ? (
        leading
      ) : row.color ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: row.color }}
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{row.label}</span>
      <span
        className={cn(
          "shrink-0 rounded px-1 py-0.5 text-micro font-normal tabular-nums",
          isActive ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
        )}
      >
        {row.count}
      </span>
    </button>
  );
});

export const PRIORITY_ORDER = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

export function GroupingSkeleton() {
  return (
    <div className="space-y-1.5 py-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-full rounded-md" />
      ))}
    </div>
  );
}

export function EmptyGroup({ label }: { label: string }) {
  return (
    <p className="py-4 text-center text-xs text-muted-foreground">{label}</p>
  );
}
