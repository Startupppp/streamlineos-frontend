"use client";

import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SemanticBadge, type BadgeTone } from "@/components/ui/semantic-badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { QuarantineRecord, QuarantineStatus } from "@/hooks/api/storage/quarantine-schema";
import { formatDateTime } from "@/lib/date-utils";
import { formatFileSize } from "@/lib/format-utils";

export type QuarantineAction = "release" | "reject" | "delete";

export const STATUS_META: Record<QuarantineStatus, { label: string; tone: BadgeTone }> = {
  pending_scan: { label: "Awaiting scan", tone: "warning" },
  clean: { label: "Released", tone: "success" },
  infected: { label: "Rejected", tone: "danger" },
  error: { label: "Scan failed", tone: "neutral" },
};

export const QUARANTINE_HEADERS = ["File", "Status", "Size", "Uploaded by", "Uploaded", ""];

interface RowActionsProps {
  row: QuarantineRecord;
  onAction: (action: QuarantineAction, row: QuarantineRecord) => void;
}

/** Release is offered only while unscanned, reject never for a released file — the backend's 409 rules. */
function RowActions({ row, onAction }: RowActionsProps) {
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

export function quarantineColumns(
  uploaderName: (userId: string) => string,
  onAction: ((action: QuarantineAction, row: QuarantineRecord) => void) | null,
): DataTableColumn<QuarantineRecord>[] {
  const columns: DataTableColumn<QuarantineRecord>[] = [
    {
      key: "filename",
      header: "File",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{row.filename}</span>
          <span className="truncate text-xs text-muted-foreground">
            {row.mimeType}
            {row.threatName ? ` · ${row.threatName}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <SemanticBadge tone={STATUS_META[row.status].tone} label={STATUS_META[row.status].label} size="xs" />,
    },
    { key: "fileSizeBytes", header: "Size", cell: (row) => <span className="font-mono tabular-nums">{formatFileSize(row.fileSizeBytes)}</span> },
    { key: "uploadedBy", header: "Uploaded by", cell: (row) => uploaderName(row.uploadedBy) },
    { key: "createdAt", header: "Uploaded", cell: (row) => formatDateTime(row.createdAt) },
  ];
  if (onAction) {
    columns.push({ key: "actions", header: "", cell: (row) => <RowActions row={row} onAction={onAction} />, className: "w-12 text-right" });
  }
  return columns;
}
