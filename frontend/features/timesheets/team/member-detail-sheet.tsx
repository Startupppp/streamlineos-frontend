"use client";

import { format, parseISO } from "date-fns";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { usePeriod, useCanViewPeriodDetail } from "@/hooks/api/timesheets-core/periods";
import { useRemindTeamMember } from "@/hooks/api/timesheets-core/team";
import { useCan } from "@/hooks/api/access";
import { PERIOD_STATUS_BADGE, PERIOD_STATUS_LABEL } from "@/features/timesheets/types";
import type { TimesheetPeriod, PeriodEntry } from "@/features/timesheets/types";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";

interface MemberDetailSheetProps {
  period: TimesheetPeriod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberUserId: string | null;
  weekStart: string;
  weekEnd: string;
}

function groupByDate(entries: PeriodEntry[]): Map<string, PeriodEntry[]> {
  const map = new Map<string, PeriodEntry[]>();
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
  memberUserId,
  weekStart,
  weekEnd,
}: MemberDetailSheetProps) {
  const canViewDetail = useCanViewPeriodDetail();
  const canRemind = useCan("timesheets:team:view");
  const remind = useRemindTeamMember();
  const handleRemind = () => {
    if (!memberUserId) return;
    remind.mutate({ userId: memberUserId, weekStart, weekEnd, memberName });
  };
  const { data: detail, isLoading, isError } = usePeriod(period?.id ?? null);

  const isMissingOrDraft =
    !period || period.status === "OPEN" || period.status === "DRAFT";

  const grouped = detail
    ? groupByDate(detail.entries)
    : new Map<string, PeriodEntry[]>();
  const sortedDates = [...grouped.keys()].sort();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left">
          <SheetTitle className="text-sm font-semibold">{memberName}</SheetTitle>
          <SheetDescription className="text-xs">
            {period
              ? `${format(parseISO(period.periodStart), "MMM d")} – ${format(parseISO(period.periodEnd), "MMM d, yyyy")}`
              : "No timesheet this week"}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-4">
        {isMissingOrDraft && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-status-warning-surface border border-status-warning-rule mb-4">
            <p className="text-xs text-status-warning-ink">No timesheet submitted yet</p>
            {canRemind && memberUserId && (
              <LoadingButton
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs border-status-warning-rule"
                isPending={remind.isPending}
                loadingText="Sending…"
                onClick={handleRemind}
              >
                Remind
              </LoadingButton>
            )}
          </div>
        )}

        {period && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge
              className={cn(
                "text-micro border px-2 py-0.5",
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

        {!canViewDetail ? (
          <EmptyState
            compact
            illustrationPreset="permissions"
            title="Access restricted"
            description="You don't have permission to view this timesheet's entries."
          />
        ) : isError ? (
          <EmptyState
            compact
            illustrationPreset="alert"
            title="Couldn't load this timesheet"
            description="The entries for this period could not be fetched."
          />
        ) : isLoading ? (
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
                    <p className="text-dense font-medium text-muted-foreground">
                      {format(parseISO(date), "EEE, MMM d")}
                    </p>
                    <span className="text-dense tabular-nums font-semibold">
                      {dayTotal.toFixed(1)}h
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/40 text-dense"
                      >
                        <TruncatedText text={entry.project?.name ?? entry.description ?? "—"} className="text-foreground max-w-[280px]" />
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
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
