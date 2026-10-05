"use client";

import { forwardRef, type MouseEvent, type ReactNode } from "react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { DataTableColumn } from "@/components/ui/data-table";
import { resolveImageUrl } from "@/lib/utils";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import type { PaginatedFeedbucketSubmissions } from "@/types/feedbucket";
import {
  STATUS_LABELS,
  STATUS_VARIANTS,
  TYPE_LABELS,
  TYPE_VARIANTS,
  formatSubmissionAge,
} from "./feedbucket-constants";

export type SubmissionRow = PaginatedFeedbucketSubmissions["data"][number];

function ScreenshotCell(row: SubmissionRow) {
  return row.screenshotUrl ? (
    <img
      src={resolveImageUrl(row.screenshotUrl) ?? row.screenshotUrl}
      alt="Screenshot"
      loading="lazy"
      decoding="async"
      className="h-10 w-14 rounded border border-border object-cover flex-shrink-0"
    />
  ) : (
    <div className="h-10 w-14 rounded border border-border bg-muted flex-shrink-0" />
  );
}

function TypeCell(row: SubmissionRow) {
  return (
    <Badge variant={TYPE_VARIANTS[row.type]} className="text-xs">
      {TYPE_LABELS[row.type]}
    </Badge>
  );
}

function MessageCell(row: SubmissionRow) {
  return (
    <TruncatedText
      text={row.message}
      lines={2}
      className="max-w-xs text-sm text-foreground"
    />
  );
}

function StatusCell(row: SubmissionRow) {
  return (
    <Badge variant={STATUS_VARIANTS[row.status]} className="text-xs">
      {STATUS_LABELS[row.status]}
    </Badge>
  );
}

function AgeCell(row: SubmissionRow) {
  return (
    <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
      {formatSubmissionAge(row.createdAt)}
    </span>
  );
}

export const SUBMISSION_COLUMNS: DataTableColumn<SubmissionRow>[] = [
  {
    key: "screenshot",
    header: "",
    cell: ScreenshotCell,
    className: "w-[72px] pr-0",
  },
  { key: "type", header: "Type", cell: TypeCell, className: "w-[90px]" },
  { key: "message", header: "Message", cell: MessageCell },
  {
    key: "status",
    header: "Status",
    cell: StatusCell,
    className: "w-[110px] hidden sm:table-cell",
  },
  {
    key: "age",
    header: "Age",
    cell: AgeCell,
    className: "hidden sm:table-cell w-[120px] text-right",
  },
];

function LinkedTicketCell(projectId: number) {
  return function LinkedTicket(row: SubmissionRow) {
    if (!row.linkedTicketKey) return null;
    return (
      <a
        href={`/build/${projectId}/tickets/${encodeURIComponent(row.linkedTicketKey)}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono bg-muted text-foreground hover:bg-accent transition-colors"
        aria-label={`Open ticket ${row.linkedTicketKey}`}
      >
        {row.linkedTicketKey}
      </a>
    );
  };
}

export function buildSubmissionColumnsWithLinkedTicket(
  projectId: number,
): DataTableColumn<SubmissionRow>[] {
  return [
    ...SUBMISSION_COLUMNS,
    {
      key: "linkedTicket",
      header: "Ticket",
      cell: LinkedTicketCell(projectId),
      className: "w-[130px] hidden sm:table-cell",
    },
  ];
}

export function SubmissionMobileCard({
  row,
  actions,
}: {
  row: SubmissionRow;
  actions?: ReactNode;
}) {
  return (
    <BuildMobileCard
      eyebrow={TypeCell(row)}
      title={MessageCell(row)}
      status={StatusCell(row)}
      meta={[{ label: "Age", value: formatSubmissionAge(row.createdAt) }]}
      actions={actions}
    />
  );
}

interface DeleteSubmissionButtonProps {
  submissionId: number;
  onRequestDelete: (submissionId: number) => void;
}

export const DeleteSubmissionButton = forwardRef<
  HTMLButtonElement,
  DeleteSubmissionButtonProps
>(function DeleteSubmissionButton({ submissionId, onRequestDelete }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onRequestDelete(submissionId);
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      aria-label="Delete submission"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-status-danger-ink"
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={14} />
    </button>
  );
});
