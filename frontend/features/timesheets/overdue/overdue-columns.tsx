import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  PERIOD_STATUS_BADGE,
  PERIOD_STATUS_LABEL,
  type OverduePeriod,
} from "@/features/timesheets/types";
import {
  describeEscalation,
  escalationLabel,
  escalationTone,
} from "./overdue-escalation";

/**
 * `parseISO` and not `new Date`, for every one of these.
 *
 * All four dates arrive as bare `YYYY-MM-DD`. `new Date("2026-09-01")` is
 * parsed as UTC midnight and then rendered in the reader's zone, so anyone west
 * of UTC is shown the previous day — a period that ended on the 1st reads as
 * ending on the 31st, and the due date a person is being chased about is off by
 * one. `parseISO` reads a date-only string as local midnight.
 */
function day(value: string): string {
  return format(parseISO(value), "d MMM yyyy");
}

export function buildOverdueColumns(
  thresholds: readonly number[],
): DataTableColumn<OverduePeriod>[] {
  return [
    {
      key: "person",
      header: "Person",
      cell: (row) => (
        <div className="min-w-0">
          <TruncatedText
            text={row.userName ?? row.userEmail ?? "Unknown member"}
            className="text-sm font-medium"
          />
          {row.userName && row.userEmail ? (
            <p className="truncate text-micro text-muted-foreground">
              {row.userEmail}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "daysOverdue",
      header: "Days late",
      className: "text-right font-mono tabular-nums",
      headerClassName: "text-right",
      cell: (row) => `${row.daysOverdue}d`,
    },
    {
      key: "escalation",
      header: "Reminders",
      cell: (row) => {
        const state = describeEscalation(row, thresholds);
        const tone = statusToneClasses(escalationTone(state));
        return (
          <Badge
            variant="outline"
            className={cn(tone.surface, tone.ink, tone.rule, "whitespace-nowrap")}
          >
            {escalationLabel(state)}
          </Badge>
        );
      },
    },
    {
      key: "dueDate",
      header: "Was due",
      className: "tabular-nums",
      cell: (row) => day(row.dueDate),
    },
    {
      key: "period",
      header: "Period",
      className: "tabular-nums text-muted-foreground",
      cell: (row) => `${day(row.periodStart)} – ${day(row.periodEnd)}`,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={PERIOD_STATUS_BADGE[row.status]}>
          {PERIOD_STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "hours",
      header: "Logged so far",
      className: "text-right font-mono tabular-nums",
      headerClassName: "text-right",
      cell: (row) => `${Number(row.totalHours).toFixed(2)}h`,
    },
  ];
}
