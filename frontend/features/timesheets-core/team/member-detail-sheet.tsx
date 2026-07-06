"use client";

import { useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePeriod } from "@/hooks/api/timesheets-core/periods";
import { PERIOD_STATUS_BADGE, PERIOD_STATUS_LABEL } from "@/features/timesheets-core/types";
import type { TimesheetPeriod, TimesheetEntry } from "@/features/timesheets-core/types";
import { cn } from "@/lib/utils";

interface MemberDetailSheetProps {
  period: TimesheetPeriod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
}

function groupByDate(entries: TimesheetEntry[]): Map<string, TimesheetEntry[]> {
  const map = new Map<string, TimesheetEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.date) ?? [];
    list.push(entry);
    map.set(entry.date, list);
  }
  return map;
}

export function MemberDetailSheet({
  period,
  open,
  onOpenChange,
  memberName,
}: MemberDetailSheetProps) {
  const { data: detail, isLoading } = usePeriod(period?.id ?? null);

  const handleRemind = useCallback(() => {
    toast.success(`Reminder sent to ${memberName}`);
  }, [memberName]);

  const handleOpenChange = useCallback(
    (v: boolean) => onOpenChange(v),
    [onOpenChange],
  );

  const isMissingOrDraft =
    !period || period.status === "OPEN" || period.status === "DRAFT";

  const grouped = detail
    ? groupByDate(detail.entries)
    : new Map<string, TimesheetEntry[]>();
  const sortedDates = [...grouped.keys()].sort();

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-sm font-semibold">{memberName}</SheetTitle>
          <SheetDescription className="text-xs">
            {period
              ? `${format(parseISO(period.periodStart), "MMM d")} – ${format(parseISO(period.periodEnd), "MMM d, yyyy")}`
              : "No timesheet this week"}
          </SheetDescription>
        </SheetHeader>

        {isMissingOrDraft && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4">
            <p className="text-xs text-amber-700">No timesheet submitted yet</p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 border-amber-300"
              onClick={handleRemind}
            >
              <Bell className="h-3 w-3" />
              Remind
            </Button>
          </div>
        )}

        {period && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge
              className={cn(
                "text-[10px] border px-2 py-0.5",
                PERIOD_STATUS_BADGE[period.status],
              )}
            >
              {PERIOD_STATUS_LABEL[period.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {parseFloat(period.totalHours).toFixed(1)}h total ·{" "}
              {parseFloat(period.billableHours).toFixed(1)}h billable
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : sortedDates.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No entries logged this period
          </p>
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => {
              const dayEntries = grouped.get(date) ?? [];
              const dayTotal = dayEntries.reduce((s, e) => s + parseFloat(e.hours), 0);
              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {format(parseISO(date), "EEE, MMM d")}
                    </p>
                    <span className="text-[11px] tabular-nums font-semibold">
                      {dayTotal.toFixed(1)}h
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/40 text-[11px]"
                      >
                        <span className="text-foreground truncate max-w-[280px]">
                          {entry.project?.name ?? entry.description ?? "—"}
                        </span>
                        <span className="tabular-nums text-muted-foreground shrink-0 ml-2">
                          {parseFloat(entry.hours).toFixed(1)}h
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
