"use client";

import { useCallback } from "react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import type { Bug } from "@/types/projects";

export const BUGS_TABLE_HEADERS = [
  "ID",
  "Title",
  "Severity",
  "Status",
  "Priority",
  "Assignee",
  "Actions",
] as const;

const SEVERITY_STYLES: Record<string, string> = {
  blocker: "text-status-danger-ink border-status-danger-rule bg-status-danger-surface",
  critical: "text-status-danger-ink border-status-danger-rule",
  major: "text-status-warning-ink border-status-warning-rule",
  minor: "text-muted-foreground border-border",
  trivial: "text-muted-foreground border-border",
};

const STATUS_STYLES: Record<string, string> = {
  new: "text-muted-foreground border-border",
  triaged: "text-status-info-ink border-status-info-rule",
  assigned: "text-status-info-ink border-status-info-rule",
  in_progress: "text-status-warning-ink border-status-warning-rule",
  fixed: "text-status-success-ink border-status-success-rule",
  ready_for_qa: "text-status-info-ink border-status-info-rule",
  verified: "text-status-success-ink border-status-success-rule",
  reopened: "text-category-orange-ink border-category-orange-rule",
  closed: "text-muted-foreground border-border",
};

export const BUG_STATUS_LABELS: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  assigned: "Assigned",
  in_progress: "In Progress",
  fixed: "Fixed",
  ready_for_qa: "Ready for QA",
  verified: "Verified",
  reopened: "Reopened",
  closed: "Closed",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "text-muted-foreground border-border",
  MEDIUM: "text-status-warning-ink border-status-warning-rule",
  HIGH: "text-status-danger-ink border-status-danger-rule",
  URGENT: "text-status-danger-ink border-status-danger-rule bg-status-danger-surface",
};

export function BugStatusBadge({ qaState, status }: { qaState?: string | null; status: string }) {
  const key = qaState ?? status;
  return (
    <Badge
      variant="outline"
      className={cn("text-micro", STATUS_STYLES[key] ?? "text-muted-foreground border-border")}
    >
      {BUG_STATUS_LABELS[key] ?? key}
    </Badge>
  );
}

export function BugSeverityBadge({ severity }: { severity?: string | null }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-micro capitalize",
        SEVERITY_STYLES[severity ?? ""] ?? "text-muted-foreground border-border",
      )}
    >
      {severity ?? "—"}
    </Badge>
  );
}

interface BugRowHandlers {
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (bug: Bug) => void;
  onDelete: (bug: Bug) => void;
}

export function BugRowActions({
  bug,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: { bug: Bug } & BugRowHandlers) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(bug), [bug, onEdit]);
  const handleDelete = useCallback(() => onDelete(bug), [bug, onDelete]);
  if (!canUpdate && !canDelete) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label={`Actions for BUG-${bug.ticketNumber}`}
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canUpdate ? <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem> : null}
        {canDelete ? (
          <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function buildBugsColumns({
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: BugRowHandlers): DataTableColumn<Bug>[] {
  return [
    {
      key: "ticketNumber",
      header: "ID",
      cell: (row) => (
        <span className="font-mono tabular-nums text-dense text-muted-foreground">
          BUG-{row.ticketNumber}
        </span>
      ),
      className: "w-[72px]",
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          <TruncatedText text={row.title} className="text-dense font-medium" />
          {(row.reopenCount ?? 0) > 0 ? (
            <Badge
              variant="outline"
              className="shrink-0 text-micro text-status-warning-ink border-status-warning-rule"
            >
              ×{row.reopenCount}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      cell: (row) => <BugSeverityBadge severity={row.severity} />,
      className: "w-[90px]",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <BugStatusBadge qaState={row.qaState} status={row.status} />,
      className: "w-[110px]",
    },
    {
      key: "priority",
      header: "Priority",
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn(
            "text-micro capitalize",
            PRIORITY_STYLES[row.priority] ?? "text-muted-foreground border-border",
          )}
        >
          {row.priority.toLowerCase()}
        </Badge>
      ),
      className: "w-[80px]",
    },
    {
      key: "assignee",
      header: "Assignee",
      cell: () => (
        <TruncatedText text="—" className="max-w-[7rem] text-dense text-muted-foreground" />
      ),
      className: "w-[120px]",
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      cell: (row) => (
        <BugRowActions
          bug={row}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
      className: "w-[40px]",
    },
  ];
}

export function BugMobileCard({
  bug,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: { bug: Bug } & BugRowHandlers) {
  return (
    <BuildMobileCard
      eyebrow={`BUG-${bug.ticketNumber}`}
      title={bug.title}
      status={<BugStatusBadge qaState={bug.qaState} status={bug.status} />}
      meta={[
        { label: "Severity", value: <BugSeverityBadge severity={bug.severity} /> },
        {
          label: "Priority",
          value: bug.priority.toLowerCase(),
        },
      ]}
      actions={
        <BugRowActions
          bug={bug}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      }
    />
  );
}
