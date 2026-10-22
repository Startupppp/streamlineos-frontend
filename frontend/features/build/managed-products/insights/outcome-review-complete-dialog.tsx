"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { MEASURE_KIND_OPTIONS } from "./outcome-review-form-schema";
import { optionalDecimalField } from "./opportunity-rice-schema";
import type { UpdateOutcomeReviewInput } from "@/hooks/api/build/outcome-review-mutations";
import type { DiscoveryReviewsListOutcomeReviewsResponse } from "@/contracts/build-contracts.generated";

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

export function CompleteReviewDialog({
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
