"use client";

import { format, parseISO } from "date-fns";
import { CircleCheckIcon, XIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  EXCEPTION_RULE_LABEL,
  EXCEPTION_SEVERITY_BADGE,
  EXCEPTION_SEVERITY_LABEL,
  EXCEPTION_STATUS_BADGE,
  EXCEPTION_STATUS_LABEL,
  type TimesheetException,
} from "@/features/timesheets/exception-types";
import { cn } from "@/lib/utils";

function memberName(row: TimesheetException): string {
  return row.user?.name ?? row.user?.email ?? "Unknown user";
}

export interface ExceptionColumnOptions {
  canManage: boolean;
  /** True while the queue is showing statuses other than OPEN. */
  showResolution: boolean;
  onResolve: (exception: TimesheetException) => void;
  onDismiss: (exception: TimesheetException) => void;
}

export function buildExceptionColumns({
  canManage,
  showResolution,
  onResolve,
  onDismiss,
}: ExceptionColumnOptions): DataTableColumn<TimesheetException>[] {
  const columns: DataTableColumn<TimesheetException>[] = [
    {
      key: "severity",
      header: "Severity",
      cell: (row) => (
        <Badge
          className={cn(
            "text-micro border px-1.5 py-0",
            EXCEPTION_SEVERITY_BADGE[row.severity],
          )}
        >
          {EXCEPTION_SEVERITY_LABEL[row.severity]}
        </Badge>
      ),
    },
    {
      key: "rule",
      header: "Rule",
      cell: (row) => (
        <span className="text-dense font-medium">{EXCEPTION_RULE_LABEL[row.rule]}</span>
      ),
    },
    {
      key: "message",
      header: "Message",
      className: "max-w-[280px]",
      cell: (row) => (
        <TruncatedText text={row.message} className="text-dense text-muted-foreground" />
      ),
    },
    {
      key: "worker",
      header: "Member",
      cell: (row) => (
        <div>
          <p className="text-dense font-medium">{memberName(row)}</p>
          {row.user?.name && row.user?.email && (
            <p className="text-micro text-muted-foreground">{row.user.email}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge
          className={cn(
            "text-micro border px-1.5 py-0",
            EXCEPTION_STATUS_BADGE[row.status],
          )}
        >
          {EXCEPTION_STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "dueDate",
      header: "Due",
      cell: (row) =>
        row.dueDate ? (
          <span className="text-dense tabular-nums">
            {format(parseISO(row.dueDate), "MMM d, yyyy")}
          </span>
        ) : (
          <span className="text-muted-foreground/30">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Detected",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">
          {format(parseISO(row.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
  ];

  /**
   * A closed exception is only auditable if you can see why it was closed.
   * The reason is required at the API (min 3 chars) and was stored, displayed
   * nowhere, so "Resolved" was an assertion with no evidence behind it.
   */
  if (showResolution) {
    columns.push({
      key: "resolution",
      header: "Resolution",
      className: "max-w-[240px]",
      cell: (row) =>
        row.resolutionReason ? (
          <div>
            <TruncatedText
              text={row.resolutionReason}
              className="text-dense text-muted-foreground"
            />
            {row.resolvedAt && (
              <p className="text-micro text-muted-foreground/70 tabular-nums">
                {format(parseISO(row.resolvedAt), "MMM d, yyyy")}
              </p>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground/30">—</span>
        ),
    });
  }

  if (canManage) {
    columns.push({
      key: "actions",
      header: "",
      className: "w-16",
      cell: (row) =>
        row.status === "OPEN" ? (
          <div className="flex items-center gap-0.5">
            <AnimatedIconButton
              icon={CircleCheckIcon}
              iconSize={12}
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-status-success-ink hover:text-status-success-ink"
              aria-label={`Resolve ${EXCEPTION_RULE_LABEL[row.rule]} for ${memberName(row)}`}
              onClick={() => onResolve(row)}
            />
            <AnimatedIconButton
              icon={XIcon}
              iconSize={12}
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              aria-label={`Dismiss ${EXCEPTION_RULE_LABEL[row.rule]} for ${memberName(row)}`}
              onClick={() => onDismiss(row)}
            />
          </div>
        ) : null,
    });
  }

  return columns;
}
