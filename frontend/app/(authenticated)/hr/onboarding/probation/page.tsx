"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";

import { useProbationList, type ProbationReview } from "@/hooks/api/hr/probation";
import { ProbationConfirmSheet } from "@/features/hr/onboarding/components/probation-confirm-sheet";
import { ProbationExtendSheet } from "@/features/hr/onboarding/components/probation-extend-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";

type StatusConfig = {
  label: string;
  className: string;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  in_probation: {
    label: "In Probation",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-800",
  },
  review_due: {
    label: "Review Due",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-800",
  },
  extended: {
    label: "Extended",
    className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-800",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-800",
  },
  terminated: {
    label: "Terminated",
    className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-800",
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
  onExtend: (review: ProbationReview) => void;
  onConfirm: (review: ProbationReview) => void;
}

function ProbationRow({ review, onExtend, onConfirm }: ProbationRowProps) {
  const config = getStatusConfig(review.status);
  const canAct = review.status === "review_due" || review.status === "in_probation" || review.status === "extended";
  const effectiveEndDate = review.extendedUntil ?? review.probationEndDate;

  const handleExtend = useCallback(() => onExtend(review), [review, onExtend]);
  const handleConfirm = useCallback(() => onConfirm(review), [review, onConfirm]);

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-primary">
            {review.firstName[0]}{review.lastName[0]}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <TruncatedText text={`${review.firstName} ${review.lastName}`} className="text-sm font-semibold" />
            <Badge
              variant="outline"
              className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", config.className)}
            >
              {config.label}
            </Badge>
            {review.extensionCount > 0 && (
              <Badge
                variant="outline"
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border-border"
              >
                {review.extensionCount}x extended
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span>ID: {review.employmentId}</span>
            <span>Ends: {formatDate(effectiveEndDate)}</span>
            {review.workEmail && <span className="hidden sm:inline">{review.workEmail}</span>}
          </div>
        </div>

        {canAct && (
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

export default function ProbationPage() {
  const { data, isLoading, isError, refetch } = useProbationList();
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

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
        <EmptyState
          illustrationPreset="alert"
          title="Failed to load probation reviews"
          description="Something went wrong. Please try again."
          action={{ label: "Retry", onClick: handleRetry }}
        />
      </PageWrapper>
    );
  }

  const reviews = data ?? [];

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
              onExtend={handleExtend}
              onConfirm={handleConfirm}
            />
          ))}
        </div>
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
