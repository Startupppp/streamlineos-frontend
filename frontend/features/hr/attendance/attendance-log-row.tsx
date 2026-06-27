"use client";

import { memo } from "react";
import { format } from "date-fns";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AttendanceLog } from "@/types/hr";
import { tableStatusBadge, formatDuration } from "./attendance-utils";
import { cn } from "@/lib/utils";

interface AttendanceLogRowProps {
  log: AttendanceLog;
  index: number;
}

const statusBadgeClasses: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  ABSENT: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
  LATE: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  HALF_DAY: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  WFH: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800",
  ON_BREAK: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  CHECKED_OUT: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-800",
};

export const AttendanceLogRow = memo(function AttendanceLogRow({ log, index }: AttendanceLogRowProps) {
  const statusKey = log.status || "PRESENT";

  const badgeClass = statusBadgeClasses[statusKey] ?? statusBadgeClasses.PRESENT;

  const statusLabel =
    statusKey === "CHECKED_OUT"
      ? "Checked Out"
      : statusKey === "ON_BREAK"
      ? "On Break"
      : statusKey === "HALF_DAY"
      ? "Half Day"
      : statusKey.charAt(0) + statusKey.slice(1).toLowerCase();

  return (
    <TableRow
      className={cn(
        "hover:bg-muted/30 transition-colors duration-200",
        index % 2 === 0 ? "bg-background" : "bg-muted/20"
      )}
    >
      <TableCell className="font-medium text-sm px-4 py-2.5">
        {format(new Date(log.date), "EEE, MMM dd")}
      </TableCell>
      <TableCell className="font-mono text-sm px-4 py-2.5 tabular-nums text-muted-foreground">
        {log.checkIn ? format(new Date(log.checkIn), "hh:mm a") : "--"}
      </TableCell>
      <TableCell className="font-mono text-sm px-4 py-2.5 tabular-nums text-muted-foreground">
        {log.checkOut ? format(new Date(log.checkOut), "hh:mm a") : "--"}
      </TableCell>
      <TableCell className="px-4 py-2.5 font-mono text-sm tabular-nums">
        {log.workHours ? formatDuration(log.workHours) : "--"}
      </TableCell>
      <TableCell className="px-4 py-2.5">
        <Badge
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            badgeClass
          )}
        >
          {statusLabel}
        </Badge>
      </TableCell>
    </TableRow>
  );
});
