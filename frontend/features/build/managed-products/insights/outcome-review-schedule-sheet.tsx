"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { DatePicker } from "@/components/ui/date-picker";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import {
  scheduleOutcomeReviewSchema,
  type ScheduleOutcomeReviewValues,
} from "./outcome-review-form-schema";
import type { CreateOutcomeReviewInput } from "@/hooks/api/build/outcome-review-mutations";
import { useOpportunities } from "@/hooks/api/build/product-discovery";
import { useGoals } from "@/hooks/api/goals";
import { OutcomeReviewLinkField } from "./outcome-review-link-field";

const KIND_OPTIONS = [
  { label: "Outcome review", value: "outcome_review" },
  { label: "Experiment", value: "experiment" },
] as const;

const MEASURE_KIND_OPTIONS = [
  { label: "Self-reported", value: "self_reported" },
  { label: "Measured", value: "measured" },
] as const;

const DEFAULT_VALUES: ScheduleOutcomeReviewValues = {
  kind: "outcome_review",
  title: "",
  hypothesis: "",
  metric: "",
  unit: "",
  baseline: "",
  target: "",
  measureKind: "self_reported",
  metricPeriod: "",
  sourceUrl: "",
};

interface OutcomeReviewScheduleSheetProps {
  managedProductId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateOutcomeReviewInput) => void;
  isSubmitting: boolean;
}

export function OutcomeReviewScheduleSheet({
  managedProductId,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: OutcomeReviewScheduleSheetProps) {
  const { data: opportunitiesPage } = useOpportunities(managedProductId, undefined, {
    enabled: open,
  });
  const opportunities = opportunitiesPage?.data ?? [];
  const { data: goals = [] } = useGoals({ managedProductId, limit: 100 }, { enabled: open });

  function handleSubmit(values: ScheduleOutcomeReviewValues) {
    const data: CreateOutcomeReviewInput = {
      kind: values.kind,
      title: values.title,
      ...(values.opportunityId ? { opportunityId: values.opportunityId } : {}),
      ...(values.goalId ? { goalId: values.goalId } : {}),
      ...(values.hypothesis?.trim() ? { hypothesis: values.hypothesis } : {}),
      ...(values.metric?.trim() ? { metric: values.metric } : {}),
      ...(values.unit?.trim() ? { unit: values.unit } : {}),
      ...(values.baseline?.trim() ? { baseline: values.baseline } : {}),
      ...(values.target?.trim() ? { target: values.target } : {}),
      ...(values.scheduledFor?.trim() ? { scheduledFor: values.scheduledFor } : {}),
      ...(values.measureKind ? { measureKind: values.measureKind } : {}),
      ...(values.metricPeriod?.trim() ? { metricPeriod: values.metricPeriod } : {}),
      ...(values.sourceUrl?.trim() ? { sourceUrl: values.sourceUrl } : {}),
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
                  <FormControl>
                    <SelectTrigger
                      className={FIELD_CONTROL_CLASS}
                      data-testid="kind-select"
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
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
                <FormControl>
                  <Input
                    {...field}
                    className={FIELD_CONTROL_CLASS}
                    placeholder="e.g. NPS impact review"
                    data-testid="title-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <OutcomeReviewLinkField
            control={form.control}
            name="opportunityId"
            label="Opportunity"
            options={opportunities}
          />
          <OutcomeReviewLinkField control={form.control} name="goalId" label="Goal" options={goals} />
          <FormField
            control={form.control}
            name="hypothesis"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hypothesis</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className={FIELD_CONTROL_CLASS}
                    placeholder="If we do X, then Y will improve by Z"
                    rows={3}
                  />
                </FormControl>
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
                <FormControl>
                  <Input
                    {...field}
                    className={FIELD_CONTROL_CLASS}
                    placeholder="e.g. NPS score"
                  />
                </FormControl>
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
                <FormControl>
                  <Input
                    {...field}
                    className={FIELD_CONTROL_CLASS}
                    placeholder="e.g. %"
                  />
                </FormControl>
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
                <FormControl>
                  <Input
                    {...field}
                    className={FIELD_CONTROL_CLASS}
                    placeholder="Current value"
                  />
                </FormControl>
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
                <FormControl>
                  <Input
                    {...field}
                    className={FIELD_CONTROL_CLASS}
                    placeholder="Desired value"
                  />
                </FormControl>
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
                      data-testid="measure-kind-select"
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
            name="metricPeriod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Metric period</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    className={FIELD_CONTROL_CLASS}
                    placeholder="e.g. Q1 2025, Last 30 days"
                    data-testid="metric-period-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sourceUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    className={FIELD_CONTROL_CLASS}
                    placeholder="https://..."
                    data-testid="source-url-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormSheet>
  );
}
