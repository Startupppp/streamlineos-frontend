"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";

import { useProbationList, type ProbationReview } from "@/hooks/api/hr/probation";
import { ProbationConfirmSheet } from "@/features/hr/onboarding/components/probation-confirm-sheet";
import { ProbationExtendSheet } from "@/features/hr/onboarding/components/probation-extend-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";

type StatusConfig = {
  label: string;
  className: string;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  in_probation: {
    label: "In Probation",
    className: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  },
  review_due: {
    label: "Review Due",
    className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  },
  extended: {
    label: "Extended",
    className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  },
  terminated: {
    label: "Terminated",
    className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  },
};

function getStatusConfig(status: string): StatusConfig {
  return STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

function ProbationSkeletons() {
  return (
    <div className="space-y-2 pt-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] rounded-xl" />
      ))}
    </div>
  );
}

interface ProbationRowProps {
  review: ProbationReview;
  canManage: boolean;
  onExtend: (review: ProbationReview) => void;
  onConfirm: (review: ProbationReview) => void;
}

function ProbationRow({ review, canManage, onExtend, onConfirm }: ProbationRowProps) {
  const config = getStatusConfig(review.status);
  const canAct = review.status === "review_due" || review.status === "in_probation" || review.status === "extended";
  const effectiveEndDate = review.extendedUntil ?? review.probationEndDate;

  const handleExtend = useCallback(() => onExtend(review), [review, onExtend]);
  const handleConfirm = useCallback(() => onConfirm(review), [review, onConfirm]);

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 shadow-card overflow-hidden">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-micro font-bold text-primary">
            {(review.firstName ?? "")[0]}{(review.lastName ?? "")[0]}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <TruncatedText text={`${review.firstName} ${review.lastName}`} className="text-sm font-semibold" />
            <Badge
              variant="outline"
              className={cn("text-micro font-semibold px-2 py-0.5 rounded-full", config.className)}
            >
              {config.label}
            </Badge>
            {review.extensionCount > 0 && (
              <Badge
                variant="outline"
                className="text-micro font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border-border"
              >
                {review.extensionCount}x extended
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-dense text-muted-foreground flex-wrap">
            <span>ID: {review.employmentId}</span>
            <span>Ends: {formatDate(effectiveEndDate)}</span>
            {review.workEmail && <span className="hidden sm:inline">{review.workEmail}</span>}
          </div>
        </div>

        {canManage && canAct && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 duration-200"
              onClick={handleExtend}
            >
              Extend
            </Button>
            <Button
              size="sm"
              className="text-xs gap-1.5 duration-200 bg-primary hover:bg-primary/90 text-primary-foreground border-0"
              onClick={handleConfirm}
            >
              Confirm
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProbationPage() {
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([]);
  const canManage = useCan("hr:probation:manage");
  const { data, isLoading, isFetching, error, isError, refetch } = useProbationList({
    cursor,
    limit: 20,
  });
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleNext = useCallback(() => {
    const nextCursor = data?.pageInfo.nextCursor;
    if (!nextCursor) return;
    setCursorHistory((history) => [...history, cursor]);
    setCursor(nextCursor);
  }, [cursor, data?.pageInfo.nextCursor]);

  const handlePrevious = useCallback(() => {
    setCursorHistory((history) => {
      if (history.length === 0) return history;
      setCursor(history.at(-1));
      return history.slice(0, -1);
    });
  }, []);

  const [extendTarget, setExtendTarget] = useState<ProbationReview | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ProbationReview | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleExtend = useCallback((review: ProbationReview) => {
    setExtendTarget(review);
    setExtendOpen(true);
  }, []);

  const handleConfirm = useCallback((review: ProbationReview) => {
    setConfirmTarget(review);
    setConfirmOpen(true);
  }, []);

  const handleExtendOpenChange = useCallback((open: boolean) => {
    setExtendOpen(open);
    if (!open) setExtendTarget(null);
  }, []);

  const handleConfirmOpenChange = useCallback((open: boolean) => {
    setConfirmOpen(open);
    if (!open) setConfirmTarget(null);
  }, []);

  if (isLoading) {
    return (
      <PageWrapper title="Probation Reviews" subtitle="Employees due for review or confirmation" backHref="/hr/onboarding">
        <ProbationSkeletons />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Probation Reviews" subtitle="Employees due for review or confirmation" backHref="/hr/onboarding">
        <ErrorState
          title="Failed to load probation reviews"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  const reviews = data?.data ?? [];

  return (
    <PageWrapper
      title="Probation Reviews"
      subtitle="Employees due for review or confirmation"
      backHref="/hr/onboarding"
    >
      {reviews.length === 0 ? (
        <EmptyState
          illustration={<EmptyPersonIllustration className="h-24 w-24" />}
          title="No probation reviews"
          description="Employees approaching their probation end date will appear here."
          compact
        />
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => (
            <ProbationRow
              key={review.id}
              review={review}
              canManage={canManage}
              onExtend={handleExtend}
              onConfirm={handleConfirm}
            />
          ))}
        </div>
      )}

      {(cursorHistory.length > 0 || data?.pageInfo.hasMore) && (
        <CursorPageControls
          className="mt-4"
          page={cursorHistory.length + 1}
          hasNext={data?.pageInfo.hasMore ?? false}
          disabled={isFetching}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />
      )}

      <ProbationExtendSheet
        review={extendTarget}
        open={extendOpen}
        onOpenChange={handleExtendOpenChange}
      />

      <ProbationConfirmSheet
        review={confirmTarget}
        open={confirmOpen}
        onOpenChange={handleConfirmOpenChange}
      />
    </PageWrapper>
  );
}
