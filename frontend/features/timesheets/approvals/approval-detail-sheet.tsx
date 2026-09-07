"use client";

import { useState, useCallback, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AiActionsMenu, type AiAction } from "@/components/ai";
import { useCan } from "@/hooks/api/access";
import { usePeriod } from "@/hooks/api/timesheets-core/periods";
import { useApprovePeriod, useRejectPeriod } from "@/hooks/api/timesheets-core/approvals";
import { fetchTimesheetPeriodSummary, draftRejectionReason } from "@/hooks/api/timesheets-core/ai";
import {
  PERIOD_STATUS_BADGE,
  PERIOD_STATUS_LABEL,
  ENTRY_STATUS_BADGE,
} from "@/features/timesheets/types";
import type { TimesheetPeriod, PeriodEntry } from "@/features/timesheets/types";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";

interface ApprovalDetailSheetProps {
  period: TimesheetPeriod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function ApprovalDetailSheet({
  period,
  open,
  onOpenChange,
}: ApprovalDetailSheetProps) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: detail, isLoading } = usePeriod(period?.id ?? null);
  const approveMutation = useApprovePeriod();
  const rejectMutation = useRejectPeriod();

  const handleApprove = useCallback(() => {
    if (!period) return;
    approveMutation.mutate(period.id, {
      onSuccess: () => onOpenChange(false),
    });
  }, [period, approveMutation, onOpenChange]);

  const handleReject = useCallback(() => {
    if (!period || !rejectReason.trim()) return;
    rejectMutation.mutate(
      { periodId: period.id, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
          setRejectReason("");
          setRejectMode(false);
        },
      },
    );
  }, [period, rejectReason, rejectMutation, onOpenChange]);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      onOpenChange(v);
      if (!v) {
        setRejectMode(false);
        setRejectReason("");
      }
    },
    [onOpenChange],
  );

  const handleReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setRejectReason(e.target.value);
    },
    [],
  );

  const handleEnterRejectMode = useCallback(() => setRejectMode(true), []);
  const handleCancelReject = useCallback(() => {
    setRejectMode(false);
    setRejectReason("");
  }, []);

  const grouped = detail
    ? groupByDate(detail.entries)
    : new Map<string, PeriodEntry[]>();
  const sortedDates = [...grouped.keys()].sort();
  const isActionable = period?.status === "SUBMITTED";
  const isPending = approveMutation.isPending || rejectMutation.isPending;

  const canManageApprovals = useCan("timesheets:approvals:manage");

  const aiActions = useMemo<AiAction[]>(() => {
    if (!period) return [];
    const periodId = period.id;
    return [
      {
        key: "summarize-period",
        label: "Summarize this timesheet",
        description: "Narrate hours by project, billable ratio, and notable patterns",
        run: async (signal, onToken) => {
          const res = await fetchTimesheetPeriodSummary(periodId, { signal, onToken });
          return { text: res.narration, aiUsage: res.aiUsage };
        },
      },
    ];
  }, [period]);

  const rejectionActions = useMemo<AiAction[]>(() => {
    if (!period) return [];
    const periodId = period.id;
    return [
      {
        key: "draft-rejection",
        label: "Draft rejection reason",
        description: "Constructive feedback grounded in this timesheet",
        surface: "popover",
        applyLabel: "Use this",
        run: async (signal, onToken) => {
          const res = await draftRejectionReason(periodId, rejectReason.trim() || undefined, { signal, onToken });
          return { text: res.text, aiUsage: res.aiUsage };
        },
        onApply: (text) => setRejectReason(text),
      },
    ];
  }, [period, rejectReason]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-lg">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <SheetTitle className="text-sm font-semibold">
                {period?.user?.name ?? period?.user?.email ?? "Timesheet"}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {period
                  ? `${format(parseISO(period.periodStart), "MMM d")} – ${format(parseISO(period.periodEnd), "MMM d, yyyy")}`
                  : ""}
              </SheetDescription>
            </div>
            <AiActionsMenu
              actions={aiActions}
              disabled={!period}
              menuLabel="Timesheet AI"
              align="end"
            />
          </div>
        </SheetHeader>

        <SheetBody className="px-6 py-4">
        {period && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge
              className={cn(
                "text-micro border px-1.5 py-0",
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

        {period && (
          <div className="mb-4 space-y-0.5 text-dense text-muted-foreground">
            {period.submittedAt && (
              <p>
                Submitted{" "}
                {format(parseISO(period.submittedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
            {period.approvedAt && (
              <p className="text-status-success-ink">
                Approved{" "}
                {format(parseISO(period.approvedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
            {period.rejectedAt && (
              <p className="text-status-danger-ink">
                Rejected{" "}
                {format(parseISO(period.rejectedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
            {period.rejectionReason && (
              <p className="text-status-danger-ink">Reason: {period.rejectionReason}</p>
            )}
          </div>
        )}

        <Separator className="mb-4" />

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
          <p className="text-xs text-muted-foreground text-center py-8">No entries</p>
        ) : (
          <div className="space-y-4 flex-1">
            {sortedDates.map((date) => {
              const dayEntries = grouped.get(date) ?? [];
              const dayTotal = dayEntries.reduce(
                (s, e) => s + parseFloat(e.hours),
                0,
              );
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
                        className="flex items-start justify-between px-2.5 py-1.5 rounded-md bg-muted/40 text-dense"
                      >
                        <div className="min-w-0">
                          <TruncatedText text={entry.project?.name ?? "—"} className="font-medium max-w-[280px]" />
                          {entry.description && (
                            <TruncatedText text={entry.description} className="text-muted-foreground max-w-[280px]" />
                          )}
                        </div>
                        <div className="shrink-0 ml-3 text-right">
                          <p className="tabular-nums">
                            {parseFloat(entry.hours).toFixed(1)}h
                          </p>
                          <Badge
                            className={cn(
                              "text-micro border px-1 py-0",
                              ENTRY_STATUS_BADGE[entry.status],
                            )}
                          >
                            {entry.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </SheetBody>

        {isActionable && (
          <SheetFooter className="flex-col items-stretch gap-3 border-t px-6 py-4">
            {rejectMode ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="reject-reason" className="text-xs">
                    Rejection reason <span className="text-destructive">*</span>
                  </Label>
                  {canManageApprovals ? (
                    <AiActionsMenu
                      actions={rejectionActions}
                      triggerLabel="Draft"
                      menuLabel="AI assist"
                      align="end"
                    />
                  ) : null}
                </div>
                <Textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={handleReasonChange}
                  placeholder="Provide a reason…"
                  className="text-xs resize-none"
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelReject}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <LoadingButton
                    size="sm"
                    variant="destructive"
                    onClick={handleReject}
                    isPending={isPending}
                    loadingText="Rejecting…"
                    disabled={!rejectReason.trim()}
                  >
                    Confirm reject
                  </LoadingButton>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LoadingButton
                  size="sm"
                  className="gap-1.5 flex-1"
                  onClick={handleApprove}
                  isPending={isPending}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approve
                </LoadingButton>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 flex-1 border-destructive/40 text-destructive hover:bg-destructive/5"
                  onClick={handleEnterRejectMode}
                  disabled={isPending}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
