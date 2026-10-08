"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { resolveColumnColor } from "@/lib/column-colors";
import {
  Circle,
  CircleCheck,
  CirclePlay,
  CircleX,
  GitPullRequest,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STATUS_DOT: Record<string, string> = {
  TODO: "bg-status-neutral-fill",
  IN_PROGRESS: "bg-status-info-fill",
  IN_REVIEW: "bg-status-warning-fill",
  DONE: "bg-status-success-fill",
  CANCELLED: "bg-status-danger-fill",
};

const STATUS_BADGE: Record<string, string> = {
  TODO: "bg-muted text-foreground",
  IN_PROGRESS: "bg-status-info-surface text-status-info-ink",
  IN_REVIEW: "bg-status-warning-surface text-status-warning-ink",
  DONE: "bg-status-success-surface text-status-success-ink",
  CANCELLED: "bg-status-danger-surface text-status-danger-ink",
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

interface StatusBadgeProps {
  status: string;
  customStates?: { name: string; color: string; group: string }[];
  className?: string;
  compact?: boolean;
}

export const StatusBadge = memo(function StatusBadge({
  status,
  customStates,
  className,
  compact = false,
}: StatusBadgeProps) {
  const custom = customStates?.find(
    (s) =>
      s.name === status || s.name.toUpperCase().replace(/\s+/g, "_") === status,
  );
  if (compact) {
    const label =
      custom?.name ?? STATUS_LABEL[status] ?? status.replace(/_/g, " ");
    const key = status.toUpperCase();
    const iconTone = key.includes("REVIEW") ? "text-status-warning-ink" : key.includes("PROGRESS") ? "text-status-info-ink" : key.includes("DONE") || key.includes("COMPLETE") ? "text-status-success-ink" : key.includes("CANCEL") ? "text-status-danger-ink" : "text-muted-foreground";
    const Icon = key.includes("REVIEW")
      ? GitPullRequest
      : key.includes("PROGRESS")
        ? CirclePlay
        : key.includes("DONE") || key.includes("COMPLETE")
          ? CircleCheck
          : key.includes("CANCEL")
            ? CircleX
            : Circle;
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              role="img"
              aria-label={`Status: ${label}`}
              className={cn(
                "inline-flex shrink-0", iconTone,
                className,
              )}
              style={custom ? { color: resolveColumnColor(custom.color) } : undefined}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (custom) {
    return (
      <span
        className={cn("inline-flex items-center gap-1.5 text-xs", className)}
      >
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
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          getStatusDotClass(status),
        )}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </span>
  );
});
