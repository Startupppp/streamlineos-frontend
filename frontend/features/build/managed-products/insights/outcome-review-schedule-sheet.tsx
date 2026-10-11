"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
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
import { DatePicker } from "@/components/ui/date-picker";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import {
  scheduleOutcomeReviewSchema,
  type ScheduleOutcomeReviewValues,
} from "./outcome-review-form-schema";
import type { CreateOutcomeReviewInput } from "@/hooks/api/build/product-discovery-mutations";

const KIND_OPTIONS = [
  { label: "Outcome review", value: "outcome_review" },
  { label: "Experiment", value: "experiment" },
] as const;

const DEFAULT_VALUES: ScheduleOutcomeReviewValues = {
  kind: "outcome_review",
  title: "",
};

interface OutcomeReviewScheduleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateOutcomeReviewInput) => void;
  isSubmitting: boolean;
}

export function OutcomeReviewScheduleSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: OutcomeReviewScheduleSheetProps) {
  function handleSubmit(values: ScheduleOutcomeReviewValues) {
    const data: CreateOutcomeReviewInput = {
      kind: values.kind,
      title: values.title,
      ...(values.hypothesis?.trim() ? { hypothesis: values.hypothesis } : {}),
      ...(values.metric?.trim() ? { metric: values.metric } : {}),
      ...(values.unit?.trim() ? { unit: values.unit } : {}),
      ...(values.baseline?.trim() ? { baseline: values.baseline } : {}),
      ...(values.target?.trim() ? { target: values.target } : {}),
      ...(values.scheduledFor?.trim() ? { scheduledFor: values.scheduledFor } : {}),
    };
    onSubmit(data);
  }

  return (
    <EntityFormSheet<ScheduleOutcomeReviewValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule review"
      description="Schedule an outcome review or experiment for this product."
      resolver={zodResolver(scheduleOutcomeReviewSchema)}
      defaultValues={DEFAULT_VALUES}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Schedule"
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="kind"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type (required)</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                >
                  <SelectTrigger
                    className={FIELD_CONTROL_CLASS}
                    data-testid="kind-select"
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {KIND_OPTIONS.map((o) => (
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
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title (required)</FormLabel>
                <Input
                  {...field}
                  className={FIELD_CONTROL_CLASS}
                  placeholder="e.g. NPS impact review"
                  data-testid="title-input"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hypothesis"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hypothesis</FormLabel>
                <Textarea
                  {...field}
                  className={FIELD_CONTROL_CLASS}
                  placeholder="If we do X, then Y will improve by Z"
                  rows={3}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metric"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Metric</FormLabel>
                <Input
                  {...field}
                  className={FIELD_CONTROL_CLASS}
                  placeholder="e.g. NPS score"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Input
                  {...field}
                  className={FIELD_CONTROL_CLASS}
                  placeholder="e.g. %"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="baseline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Baseline</FormLabel>
                <Input
                  {...field}
                  className={FIELD_CONTROL_CLASS}
                  placeholder="Current value"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="target"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target</FormLabel>
                <Input
                  {...field}
                  className={FIELD_CONTROL_CLASS}
                  placeholder="Desired value"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="scheduledFor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled for</FormLabel>
                <DatePicker
                  id="scheduledFor"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  clearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormSheet>
  );
}
