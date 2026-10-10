"use client";

import { useState, useCallback, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import { useCan } from "@/hooks/api/access";
import type { DiscoveryReviewsListOutcomeReviewsResponse } from "@/contracts/build-contracts.generated";
import type {
  CreateOutcomeReviewInput,
  UpdateOutcomeReviewInput,
} from "@/hooks/api/build/product-discovery-mutations";

type OutcomeReviewRow = DiscoveryReviewsListOutcomeReviewsResponse["data"][number];

const RESULT_OPTIONS = [
  { label: "Met", value: "met" },
  { label: "Partially met", value: "partially_met" },
  { label: "Not met", value: "not_met" },
  { label: "Inconclusive", value: "inconclusive" },
];

const completeSchema = z.object({
  actual: z.string().optional(),
  result: z.enum(["met", "partially_met", "not_met", "inconclusive"], {
    error: "Result is required to complete a review",
  }),
  notes: z.string().optional(),
  version: z.number().int(),
});

type CompleteFormValues = z.infer<typeof completeSchema>;

interface OutcomeReviewsSectionProps {
  managedProductId: number;
  reviews: OutcomeReviewRow[];
  isLoading: boolean;
  onCreate: (data: CreateOutcomeReviewInput) => void;
  onComplete: (reviewId: number, data: UpdateOutcomeReviewInput) => void;
  onDelete: (reviewId: number) => void;
  isCreating: boolean;
  isUpdating: boolean;
}

function CompleteReviewDialog({
  review,
  open,
  onOpenChange,
  onComplete,
  isSubmitting,
}: {
  review: OutcomeReviewRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: UpdateOutcomeReviewInput) => void;
  isSubmitting: boolean;
}) {
  return (
    <EntityFormDialog<CompleteFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Complete review"
      description={`Record the result for "${review.title}".`}
      resolver={zodResolver(completeSchema)}
      defaultValues={{ version: review.version }}
      onSubmit={(values) =>
        onComplete({
          state: "completed",
          actual: values.actual,
          result: values.result,
          notes: values.notes,
          version: values.version,
        })
      }
      isSubmitting={isSubmitting}
      submitLabel="Complete"
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="result"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Result (required)</FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger className={FIELD_CONTROL_CLASS} data-testid="result-select">
                    <SelectValue placeholder="Select result" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESULT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage data-testid="result-error" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="actual"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Actual measurement (optional)</FormLabel>
                <Input {...field} className={FIELD_CONTROL_CLASS} placeholder="e.g. 12%" />
                <FormMessage />
              </FormItem>
            )}
          />
          <Input type="hidden" {...form.register("version", { valueAsNumber: true })} />
        </div>
      )}
    </EntityFormDialog>
  );
}

export function OutcomeReviewsSection({
  reviews,
  isLoading,
  onCreate,
  onComplete,
  onDelete,
  isCreating,
  isUpdating,
}: OutcomeReviewsSectionProps) {
  const canWrite = useCan("build:managed-products:update");
  const [completingId, setCompletingId] = useState<number | null>(null);

  const completingReview = useMemo(
    () => reviews.find((r) => r.id === completingId) ?? null,
    [reviews, completingId],
  );

  const handleCompleteClose = useCallback(() => setCompletingId(null), []);

  const handleCompleteReview = useCallback(
    (data: UpdateOutcomeReviewInput) => {
      if (completingId === null) return;
      onComplete(completingId, data);
      setCompletingId(null);
    },
    [completingId, onComplete],
  );

  return (
    <section aria-labelledby="outcome-reviews-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="outcome-reviews-heading" className="text-sm font-semibold text-foreground">
          Outcome reviews &amp; experiments
        </h2>
        {canWrite && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onCreate({ kind: "outcome_review", title: "New review" })}
            disabled={isCreating}
          >
            <Plus className="size-3.5 mr-1" aria-hidden />
            Schedule
          </Button>
        )}
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {!isLoading && reviews.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="outcome-reviews-empty">
          No reviews or experiments scheduled.
        </p>
      )}

      {reviews.length > 0 && (
        <ul className="space-y-2">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-xl border border-border p-3 flex items-start justify-between gap-4"
              data-testid={`outcome-review-row-${review.id}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{review.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground capitalize">
                    {review.kind.replace("_", " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground capitalize">{review.state}</span>
                  {review.result && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs font-medium text-foreground capitalize">
                        {review.result.replace(/_/g, " ")}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {canWrite && review.state !== "completed" && review.state !== "cancelled" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCompletingId(review.id)}
                  data-testid={`complete-review-btn-${review.id}`}
                >
                  Complete
                </Button>
              )}
              {canWrite && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(review.id)}
                  className="text-destructive hover:text-destructive"
                  data-testid={`delete-review-btn-${review.id}`}
                >
                  Delete
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {completingReview !== null && (
        <CompleteReviewDialog
          review={completingReview}
          open={completingId !== null}
          onOpenChange={handleCompleteClose}
          onComplete={handleCompleteReview}
          isSubmitting={isUpdating}
        />
      )}
    </section>
  );
}
