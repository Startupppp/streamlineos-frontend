"use client";

import { useState, useCallback, useMemo } from "react";
import { isApiError } from "@/lib/api-envelope";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutcomeReviewRow } from "./outcome-review-row";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import { TablePagination } from "@/components/ui/table-pagination";
import { useCan } from "@/hooks/api/access";
import { ErrorState } from "@/components/shared/error-state";
import type { DiscoveryReviewsListOutcomeReviewsResponse } from "@/contracts/build-contracts.generated";
import type {
  CreateOutcomeReviewInput,
  UpdateOutcomeReviewInput,
} from "@/hooks/api/build/outcome-review-mutations";
import { MEASURE_KIND_OPTIONS } from "./outcome-review-form-schema";
import { optionalDecimalField } from "./opportunity-rice-schema";
import { OutcomeReviewScheduleSheet } from "./outcome-review-schedule-sheet";

type OutcomeReviewRow =
  DiscoveryReviewsListOutcomeReviewsResponse["data"][number];

const RESULT_OPTIONS = [
  { label: "Met", value: "met" },
  { label: "Partially met", value: "partially_met" },
  { label: "Not met", value: "not_met" },
  { label: "Inconclusive", value: "inconclusive" },
];

const completeSchema = z
  .object({
    actual: optionalDecimalField,
    result: z.enum(["met", "partially_met", "not_met", "inconclusive"], {
      error: "Result is required to complete a review",
    }),
    notes: z.string().max(5000).optional(),
    version: z.number().int().min(1),
    measureKind: z.enum(["self_reported", "measured"]).optional(),
    sourceUrl: z
      .string()
      .trim()
      .url("Enter a valid URL")
      .max(2000)
      .optional()
      .or(z.literal("")),
    measuredAt: z.union([z.iso.date(), z.literal("")]).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.measureKind !== "measured") return;
    if (!values.sourceUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceUrl"],
        message: "Source URL is required for measured results",
      });
    }
    if (!values.measuredAt) {
      ctx.addIssue({
        code: "custom",
        path: ["measuredAt"],
        message: "Measured date is required for measured results",
      });
    }
  });

type CompleteFormValues = z.infer<typeof completeSchema>;

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

function CompleteReviewDialog({
  review,
  open,
  onOpenChange,
  onComplete,
  isSubmitting,
  conflictMessage,
}: {
  review: OutcomeReviewRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: UpdateOutcomeReviewInput) => void;
  isSubmitting: boolean;
  conflictMessage?: string;
}) {
  return (
    <EntityFormDialog<CompleteFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Complete review"
      description={`Record the result for "${review.title}".`}
      resolver={zodResolver(completeSchema)}
      defaultValues={{
        version: review.version,
        measureKind: review.measureKind ?? "self_reported",
      }}
      onSubmit={(values) =>
        onComplete({
          state: "completed",
          actual: values.actual?.trim() || undefined,
          result: values.result,
          notes: values.notes,
          version: values.version,
          measureKind: values.measureKind ?? "self_reported",
          ...(values.sourceUrl?.trim() ? { sourceUrl: values.sourceUrl } : {}),
          ...(values.measuredAt?.trim()
            ? { measuredAt: new Date(values.measuredAt).toISOString() }
            : {}),
        })
      }
      isSubmitting={isSubmitting}
      submitLabel="Complete"
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          {conflictMessage ? (
            <p
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
              data-testid="complete-conflict-error"
            >
              {conflictMessage}
            </p>
          ) : null}
          <FormField
            control={form.control}
            name="result"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Result{" "}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => v && field.onChange(v)}
                >
                  <FormControl>
                    <SelectTrigger
                      className={FIELD_CONTROL_CLASS}
                      data-testid="result-select"
                      aria-required="true"
                    >
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RESULT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
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
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    className={FIELD_CONTROL_CLASS}
                    placeholder="e.g. 12%"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    className={FIELD_CONTROL_CLASS}
                    placeholder="What did you learn?"
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="measureKind"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Measurement approach</FormLabel>
                <Select
                  value={field.value ?? "self_reported"}
                  onValueChange={(v) => v && field.onChange(v)}
                >
                  <FormControl>
                    <SelectTrigger
                      className={FIELD_CONTROL_CLASS}
                      data-testid="complete-measure-kind-select"
                    >
                      <SelectValue placeholder="Select approach" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MEASURE_KIND_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sourceUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source URL (optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    className={FIELD_CONTROL_CLASS}
                    placeholder="https://..."
                    data-testid="complete-source-url-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="measuredAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Measured at (optional)</FormLabel>
                <DatePicker
                  id="measuredAt"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  clearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <Input
            type="hidden"
            {...form.register("version", { valueAsNumber: true })}
          />
        </div>
      )}
    </EntityFormDialog>
  );
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
  const handleScheduleSubmit = useCallback(
    (data: CreateOutcomeReviewInput) =>
      onCreate(data, () => setScheduleOpen(false)),
    [onCreate],
  );

  const completingReview = useMemo(
    () => reviews.find((r) => r.id === completingId) ?? null,
    [reviews, completingId],
  );

  const handleCompleteClose = useCallback(() => {
    setCompletingId(null);
    setCompleteError(null);
  }, []);

  const handleCompleteReview = useCallback(
    (data: UpdateOutcomeReviewInput) => {
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
    },
    [completingId, onComplete],
  );

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
