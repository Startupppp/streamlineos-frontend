"use client";

import { useState } from "react";
import { isApiError } from "@/lib/api-envelope";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutcomeReviewRow } from "./outcome-review-row";
import { TablePagination } from "@/components/ui/table-pagination";
import { useCan } from "@/hooks/api/access";
import { ErrorState } from "@/components/shared/error-state";
import { CompleteReviewDialog } from "./outcome-review-complete-dialog";
import { OutcomeReviewScheduleSheet } from "./outcome-review-schedule-sheet";
import type { DiscoveryReviewsListOutcomeReviewsResponse } from "@/contracts/build-contracts.generated";
import type {
  CreateOutcomeReviewInput,
  UpdateOutcomeReviewInput,
} from "@/hooks/api/build/outcome-review-mutations";

type OutcomeReviewRow =
  DiscoveryReviewsListOutcomeReviewsResponse["data"][number];

interface OutcomeReviewsSectionProps {
  managedProductId: number;
  reviews: OutcomeReviewRow[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasMore: boolean;
  hasPreviousPage: boolean;
  pageNumber: number;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onCreate: (data: CreateOutcomeReviewInput, onCreated: () => void) => void;
  onComplete: (
    reviewId: number,
    data: UpdateOutcomeReviewInput,
    onCompleted: () => void,
    onFailed: (err: unknown) => void,
  ) => void;
  onDelete: (reviewId: number) => void;
  isCreating: boolean;
  isUpdating: boolean;
}

export function OutcomeReviewsSection({
  managedProductId,
  reviews,
  isLoading,
  isError,
  onRetry,
  hasMore,
  hasPreviousPage,
  pageNumber,
  onNextPage,
  onPreviousPage,
  onCreate,
  onComplete,
  onDelete,
  isCreating,
  isUpdating,
}: OutcomeReviewsSectionProps) {
  const canWrite = useCan("build:managed-products:update");
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  function handleScheduleSubmit(data: CreateOutcomeReviewInput) {
    onCreate(data, () => setScheduleOpen(false));
  }

  const completingReview = reviews.find((r) => r.id === completingId) ?? null;

  function handleCompleteClose() {
    setCompletingId(null);
    setCompleteError(null);
  }

  function handleCompleteReview(data: UpdateOutcomeReviewInput) {
    if (completingId === null) return;
    setCompleteError(null);
    onComplete(
      completingId,
      data,
      () => setCompletingId(null),
      (err) => {
        if (isApiError(err) && err.status === 409) {
          setCompleteError(
            "This review was updated by someone else. Reload and try again.",
          );
        }
      },
    );
  }

  return (
    <section aria-labelledby="outcome-reviews-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2
          id="outcome-reviews-heading"
          className="text-base font-semibold text-foreground"
        >
          Outcome reviews &amp; experiments
        </h2>
        {canWrite && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setScheduleOpen(true)}
            disabled={isCreating}
          >
            <Plus className="size-3.5" aria-hidden />
            Schedule
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {isError && (
        <ErrorState
          title="Could not load outcome reviews"
          onRetry={onRetry}
          compact
        />
      )}

      {!isLoading && !isError && reviews.length === 0 && (
        <div
          className="rounded-xl border border-dashed border-border bg-card px-4 py-6"
          data-testid="outcome-reviews-empty"
        >
          <p className="text-sm font-medium text-foreground">
            No reviews scheduled
          </p>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Schedule an outcome review or experiment when you want to measure a
            result.
          </p>
        </div>
      )}

      {reviews.length > 0 && (
        <ul className="space-y-2">
          {reviews.map((review) => (
            <OutcomeReviewRow
              key={review.id}
              review={review}
              managedProductId={managedProductId}
              canWrite={canWrite}
              onComplete={() => setCompletingId(review.id)}
              onDelete={() => onDelete(review.id)}
            />
          ))}
        </ul>
      )}

      {(reviews.length > 0 || hasPreviousPage) && (
        <TablePagination
          mode="cursor"
          rowCount={reviews.length}
          pageNumber={pageNumber}
          hasMore={hasMore}
          hasPrevious={hasPreviousPage}
          onNext={onNextPage}
          onPrevious={onPreviousPage}
          hideOnSinglePage
        />
      )}

      {completingReview !== null && (
        <CompleteReviewDialog
          review={completingReview}
          open={completingId !== null}
          onOpenChange={handleCompleteClose}
          onComplete={handleCompleteReview}
          isSubmitting={isUpdating}
          conflictMessage={completeError ?? undefined}
        />
      )}

      <OutcomeReviewScheduleSheet
        managedProductId={managedProductId}
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSubmit={handleScheduleSubmit}
        isSubmitting={isCreating}
      />
    </section>
  );
}
