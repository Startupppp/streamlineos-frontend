"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimerSegment } from "./attendance-utils";

export function TimerDigit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <div className="flex h-16 w-full items-center justify-center rounded-xl border border-border bg-muted/40">
        <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-foreground sm:text-4xl">
          {formatTimerSegment(value)}
        </span>
      </div>
      <span className="text-micro font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function TimerSeparator() {
  return (
    <span
      className="mb-5 select-none text-xl font-semibold text-muted-foreground/50"
      aria-hidden
    >
      :
    </span>
  );
}

export function SessionMetric({
  label,
  value,
  icon: Icon,
  tone,
  emphasized,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "work" | "break";
  emphasized: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-xl border px-3 py-3 transition-colors",
        emphasized &&
          tone === "work" &&
          "border-status-success-rule bg-status-success-surface",
        emphasized &&
          tone === "break" &&
          "border-status-warning-rule bg-status-warning-surface",
        !emphasized && "border-border/80 bg-muted/30",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5",
          emphasized && tone === "work" && "text-status-success-ink",
          emphasized && tone === "break" && "text-status-warning-ink",
          !emphasized && "text-muted-foreground",
        )}
      >
        <Icon className="size-3.5 shrink-0 text-current" aria-hidden />
        <span className="text-dense font-medium uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "font-mono text-lg font-semibold tabular-nums tracking-tight",
          emphasized ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
