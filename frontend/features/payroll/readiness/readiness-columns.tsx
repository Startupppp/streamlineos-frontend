"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import { ReadinessBadge } from "@/components/shared/readiness-badge";
import { formatDateTime, formatRelativeTime, formatShortDate } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { PayrollReadiness } from "@/hooks/api/payroll/readiness-schema";
import type { BlockerSeverity, ReadinessBlockerRow } from "./readiness-blockers";

export type ReadinessExport = PayrollReadiness["exports"][number];

const SEVERITY_LABEL: Readonly<Record<BlockerSeverity, string>> = {
  blocker: "Blocker",
  warning: "Warning",
  info: "Note",
};

function severityDotClass(severity: BlockerSeverity): string {
  if (severity === "blocker") return statusToneClasses("danger").fill;
  if (severity === "warning") return statusToneClasses("warning").fill;
  return statusToneClasses("neutral").fill;
}

export function PersonCell({ row }: { row: ReadinessBlockerRow }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", severityDotClass(row.severity))} aria-hidden />
      <span className="min-w-0 text-dense font-medium text-foreground">
        {row.person ?? "Whole cycle"}
      </span>
    </div>
  );
}

export function ReasonCell({ row }: { row: ReadinessBlockerRow }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-dense leading-snug text-foreground">{row.reason}</p>
      <p className="text-micro text-muted-foreground">
        {SEVERITY_LABEL[row.severity]} · {row.code}
      </p>
      {row.isWaived ? (
        <span className="inline-flex items-center gap-1.5">
          <ReadinessBadge state="waived" />
          <span className="text-micro text-muted-foreground">
            {row.waivedReason ?? "No reason recorded"}
          </span>
        </span>
      ) : null}
    </div>
  );
}

export function FixCell({ row }: { row: ReadinessBlockerRow }) {
  if (row.fix === null) return <span className="text-micro text-muted-foreground">No deep link</span>;
  return (
    <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" asChild>
      <Link href={row.fix.href}>{row.fix.label}</Link>
    </Button>
  );
}

export const BLOCKER_COLUMNS: DataTableColumn<ReadinessBlockerRow>[] = [
  { key: "person", header: "Person", cell: (row) => <PersonCell row={row} /> },
  {
    key: "category",
    header: "Category",
    cell: (row) => <span className="text-dense text-muted-foreground">{row.categoryLabel}</span>,
  },
  { key: "reason", header: "Reason", cell: (row) => <ReasonCell row={row} /> },
  {
    key: "since",
    header: "Since",
    cell: (row) => (
      <span className="text-dense tabular-nums text-muted-foreground">
        {row.since === null ? "Not recorded" : formatRelativeTime(row.since)}
      </span>
    ),
  },
  {
    key: "owner",
    header: "Owner",
    cell: (row) => <span className="text-dense text-muted-foreground">{row.owner}</span>,
  },
  { key: "fix", header: "Fix", headerClassName: "text-right", className: "text-right", cell: (row) => <FixCell row={row} /> },
];

export const EXPORT_COLUMNS: DataTableColumn<ReadinessExport>[] = [
  { key: "id", header: "Export", cell: (row) => <span className="text-dense tabular-nums">#{row.id}</span> },
  {
    key: "range",
    header: "Window",
    cell: (row) => (
      <span className="text-dense tabular-nums">
        {formatShortDate(row.dateRangeStart)} – {formatShortDate(row.dateRangeEnd)}
      </span>
    ),
  },
  {
    key: "hours",
    header: "Hours",
    headerClassName: "text-right",
    className: "text-right tabular-nums",
    cell: (row) => `${Number(row.totalHours).toFixed(1)}h`,
  },
  {
    key: "workers",
    header: "Workers",
    headerClassName: "text-right",
    className: "text-right tabular-nums",
    cell: (row) => row.workerCount,
  },
  {
    key: "exportedAt",
    header: "Exported",
    cell: (row) => <span className="text-dense text-muted-foreground">{formatDateTime(row.exportedAt)}</span>,
  },
  {
    key: "receivedAt",
    header: "Received",
    cell: (row) => (
      <span className="text-dense text-muted-foreground">
        {row.receivedAt ? formatDateTime(row.receivedAt) : row.ackAt ? "Implied by acknowledgement" : "Not yet"}
      </span>
    ),
  },
  {
    key: "ack",
    header: "Acknowledged",
    cell: (row) => (
      <span className="text-dense text-muted-foreground">
        {row.ackAt ? `${row.ackStatus ?? "Acknowledged"} · ${formatDateTime(row.ackAt)}` : "Awaiting payroll"}
      </span>
    ),
  },
];
