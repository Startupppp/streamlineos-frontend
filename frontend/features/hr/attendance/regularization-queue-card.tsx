"use client";

import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { FilePen } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useApplyRegularization,
  useHrRegularizationQueue,
  useRejectRegularization,
} from "@/hooks/api/hr/attendance-regularization-queue";
import { useInvalidateAttendanceDay } from "@/hooks/api/hr/attendance-day-invalidation";
import { AttendanceDateRangeFilter } from "./attendance-date-range-filter";
import {
  istMonthRange,
  type DateRange,
  type DateRangePresetId,
} from "./attendance-date-presets";
import { RegularizationRow } from "./regularization-row";
import { RejectReasonSheet } from "./reject-reason-sheet";

const PAGE_SIZE = 50;
const QUEUE_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
type QueueStatus = (typeof QUEUE_STATUSES)[number];

function readQueueStatus(value: string): QueueStatus {
  return QUEUE_STATUSES.find((candidate) => candidate === value) ?? "PENDING";
}

export function RegularizationQueueCard() {
  const canDecide = useCan("hr:attendance:regularize");
  const invalidateAttendanceDay = useInvalidateAttendanceDay();
  const [presetId, setPresetId] = useState<DateRangePresetId>("month");
  const [range, setRange] = useState<DateRange>(() => istMonthRange());
  const [status, setStatus] = useState<QueueStatus>("PENDING");
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const page = cursorHistory.length;
  const params = useMemo(
    () => ({
      status,
      startDate: range.from,
      endDate: range.to,
      limit: PAGE_SIZE,
      ...(cursorHistory.at(-1) ? { cursor: cursorHistory.at(-1) } : {}),
    }),
    [status, range.from, range.to, cursorHistory],
  );

  const { data, isLoading, isError, error, refetch } = useHrRegularizationQueue(
    params,
    { enabled: Boolean(range.from && range.to) },
  );
  const applyMutation = useApplyRegularization();
  const rejectMutation = useRejectRegularization();
  const isPending = applyMutation.isPending || rejectMutation.isPending;

  const pageState = usePageState({
    permission: "hr:attendance:view",
    isLoading,
    isError,
    error,
  });

  const handleRangeChange = useCallback(
    (nextPreset: DateRangePresetId, nextRange: DateRange) => {
      setPresetId(nextPreset);
      setRange(nextRange);
      setCursorHistory([undefined]);
    },
    [],
  );

  const handleStatusChange = useCallback((next: string) => {
    setStatus(readQueueStatus(next));
    setCursorHistory([undefined]);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handlePrevious = useCallback(() => {
    setCursorHistory((history) =>
      history.length > 1 ? history.slice(0, -1) : history,
    );
  }, []);

  const nextCursor = data?.pagination.nextCursor;
  const handleNext = useCallback(() => {
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [nextCursor]);

  const handleApply = useCallback(
    (regularizationId: number) => {
      applyMutation.mutate(regularizationId, {
        onSuccess: () => {
          invalidateAttendanceDay();
          toast.success("Correction approved and applied");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [applyMutation, invalidateAttendanceDay],
  );

  const handleRejectOpen = useCallback((regularizationId: number) => {
    setRejectingId(regularizationId);
    setRejectionReason("");
  }, []);

  const handleRejectCancel = useCallback(() => {
    setRejectingId(null);
    setRejectionReason("");
  }, []);

  const handleRejectSheetChange = useCallback((open: boolean) => {
    if (!open) {
      setRejectingId(null);
      setRejectionReason("");
    }
  }, []);

  const handleRejectConfirm = useCallback(() => {
    if (rejectingId === null) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      toast.error("Rejection reason is required");
      return;
    }
    rejectMutation.mutate(
      { regularizationId: rejectingId, rejectionReason: reason },
      {
        onSuccess: () => {
          invalidateAttendanceDay();
          toast.success("Correction rejected");
          handleRejectCancel();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [
    rejectingId,
    rejectionReason,
    rejectMutation,
    invalidateAttendanceDay,
    handleRejectCancel,
  ]);

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="shrink-0 border-b px-4 pb-3 pt-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FilePen className="h-4 w-4 text-muted-foreground" />
            Attendance corrections
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-col gap-3 px-4 pb-5 pt-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <AttendanceDateRangeFilter
              presetId={presetId}
              range={range}
              onChange={handleRangeChange}
            />
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger
                className="w-full lg:ml-auto lg:w-[150px]"
                size="sm"
                aria-label="Filter corrections by status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Needs a decision</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pageState.kind !== "ready" && pageState.kind !== "empty" ? (
            <PageState
              resolution={pageState}
              compact
              onRetry={handleRetry}
              loading={
                <div className="space-y-2">
                  {[1, 2, 3].map((key) => (
                    <Skeleton key={key} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              }
            >
              {null}
            </PageState>
          ) : rows.length === 0 ? (
            <EmptyState
              illustrationPreset="calendar"
              title={
                status === "PENDING"
                  ? "No corrections waiting"
                  : "No corrections in this range"
              }
              description="Corrections employees raise for this date range appear here."
              compact
              filtersActive
            />
          ) : (
            <>
              <ul
                className="divide-y divide-border/60"
                aria-label="Attendance corrections"
              >
                {rows.map((row) => (
                  <RegularizationRow
                    key={row.id}
                    row={row}
                    canDecide={canDecide}
                    isPending={isPending}
                    onApply={handleApply}
                    onReject={handleRejectOpen}
                  />
                ))}
              </ul>
              {pagination && (page > 1 || pagination.hasMore) ? (
                <CursorPageControls
                  page={page}
                  hasNext={pagination.hasMore}
                  disabled={isLoading}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <RejectReasonSheet
        open={rejectingId !== null}
        onOpenChange={handleRejectSheetChange}
        title="Reject correction"
        description="Provide a reason for rejecting this correction."
        placeholder="E.g. Times do not match the shift roster."
        fieldId="regularization-rejection-reason"
        value={rejectionReason}
        onValueChange={setRejectionReason}
        isPending={rejectMutation.isPending}
        onCancel={handleRejectCancel}
        onConfirm={handleRejectConfirm}
      />
    </>
  );
}
