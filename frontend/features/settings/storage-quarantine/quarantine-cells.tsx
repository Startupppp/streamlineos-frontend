"use client";

import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import type { QuarantineRecord, QuarantineStatus } from "@/hooks/api/storage/quarantine-schema";
import { formatFileSize } from "@/lib/format-utils";

export type QuarantineAction = "release" | "reject" | "delete";

export const STATUS_META: Record<QuarantineStatus, { label: string; tone: BadgeTone }> = {
  pending_scan: { label: "Awaiting scan", tone: "warning" },
  clean: { label: "Released", tone: "success" },
  infected: { label: "Rejected", tone: "danger" },
  error: { label: "Scan failed", tone: "neutral" },
};

export const QUARANTINE_HEADERS = ["File", "Status", "Size", "Uploaded by", "Uploaded", ""];

export interface RowActionsProps {
  row: QuarantineRecord;
  onAction: (action: QuarantineAction, row: QuarantineRecord) => void;
}

export function RowActions({ row, onAction }: RowActionsProps) {
  function handleRelease() {
    onAction("release", row);
  }
  function handleReject() {
    onAction("reject", row);
  }
  function handleDelete() {
    onAction("delete", row);
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedIconButton icon={EllipsisIcon} iconSize={14} variant="ghost" size="sm" aria-label={`Actions for ${row.filename}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {row.status === "pending_scan" ? <DropdownMenuItem onSelect={handleRelease}>Release</DropdownMenuItem> : null}
        {row.status !== "clean" ? <DropdownMenuItem onSelect={handleReject}>Reject</DropdownMenuItem> : null}
        <DropdownMenuItem onSelect={handleDelete} className="text-destructive">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function quarantineCells(uploaderName: (userId: string) => string) {
  return {
    filename: (row: QuarantineRecord) => (
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{row.filename}</span>
        <span className="truncate text-xs text-muted-foreground">
          {row.mimeType}
          {row.threatName ? ` · ${row.threatName}` : ""}
        </span>
      </div>
    ),
    fileSizeBytes: (row: QuarantineRecord) => (
      <span className="font-mono tabular-nums">{formatFileSize(row.fileSizeBytes)}</span>
    ),
    uploadedBy: (row: QuarantineRecord) => uploaderName(row.uploadedBy),
  };
}
