"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { resolveColumnColor } from "@/features/build/shared/column-colors";
import type { StatusConfigEntry } from "@/features/build/shared/types";

const STATUS_DOT: Record<string, string> = {
  TODO: "bg-slate-400",
  IN_PROGRESS: "bg-blue-500",
  IN_REVIEW: "bg-amber-500",
  DONE: "bg-emerald-500",
  CANCELLED: "bg-red-400",
};

const STATUS_BADGE: Record<string, string> = {
  TODO: "bg-muted text-foreground dark:bg-slate-500/10 dark:text-slate-300",
  IN_PROGRESS: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  IN_REVIEW: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  DONE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
};

const STATUS_HEX: Record<string, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#d97706",
  DONE: "#10b981",
  CANCELLED: "#f87171",
};

const STATUS_LABEL: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export function getStatusDotClass(status: string): string {
  return STATUS_DOT[status] ?? "bg-muted-foreground/40";
}

export function getStatusBadgeClass(status: string): string {
  return STATUS_BADGE[status] ?? "bg-muted text-muted-foreground";
}

export function getStatusHexColor(status: string): string {
  return STATUS_HEX[status] ?? "#94a3b8";
}

interface StatusConfigDotProps {
  entry: StatusConfigEntry;
  className?: string;
}

export function StatusConfigDot({
  entry,
  className = "h-2 w-2 shrink-0 rounded-full",
}: StatusConfigDotProps) {
  if (entry.color) {
    return (
      <span
        className={className}
        style={{ backgroundColor: resolveColumnColor(entry.color) }}
        aria-hidden="true"
      />
    );
  }
  return <span className={cn(className, entry.dotColor)} aria-hidden="true" />;
}

interface StatusBadgeProps {
  status: string;
  customStates?: { name: string; color: string; group: string }[];
  className?: string;
}

export const StatusBadge = memo(function StatusBadge({ status, customStates, className }: StatusBadgeProps) {
  const custom = customStates?.find(
    (s) => s.name === status || s.name.toUpperCase().replace(/\s+/g, "_") === status,
  );

  if (custom) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: resolveColumnColor(custom.color) }}
          aria-hidden="true"
        />
        <span className="truncate">{custom.name}</span>
      </span>
    );
  }

  const label = STATUS_LABEL[status] ?? status.replace(/_/g, " ");

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", getStatusDotClass(status))} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
});
