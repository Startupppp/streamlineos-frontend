"use client";

import { useState, useCallback, useMemo } from "react";
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
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  scheduleOutcomeReviewSchema,
  type ScheduleOutcomeReviewValues,
} from "./outcome-review-form-schema";
import type { CreateOutcomeReviewInput } from "@/hooks/api/build/outcome-review-mutations";
import { useGoals } from "@/hooks/api/goals";
import { OutcomeReviewLinkField } from "./outcome-review-link-field";
import { OutcomeReviewMeasurementFields } from "./outcome-review-measurement-fields";
import { useInfiniteSelectorOpportunities } from "../use-infinite-selector";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";

const KIND_OPTIONS = [
  { label: "Outcome review", value: "outcome_review" },
  { label: "Experiment", value: "experiment" },
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
  const [opSearch, setOpSearch] = useState("");
  const [goalsSearch, setGoalsSearch] = useState("");
  const debouncedOpSearch = useDebouncedValue(opSearch, 300);
  const debouncedGoalsSearch = useDebouncedValue(goalsSearch, 300);

  const opsQ = useInfiniteSelectorOpportunities(managedProductId, debouncedOpSearch, open);
  const opsItems = useMemo(() => opsQ.data?.pages.flatMap((p) => p.data) ?? [], [opsQ.data]);

  const goalsQ = useGoals({ managedProductId, search: debouncedGoalsSearch || undefined }, { enabled: open });
  const goalsItems = useMemo(() => goalsQ.data ?? [], [goalsQ.data]);

  const handleOpSearch = useCallback((v: string) => setOpSearch(v), []);
  const handleGoalsSearch = useCallback((v: string) => setGoalsSearch(v), []);
  const handleFetchOpsNext = useCallback(() => {
    if (opsQ.hasNextPage && !opsQ.isFetchingNextPage) void opsQ.fetchNextPage();
  }, [opsQ.fetchNextPage, opsQ.hasNextPage, opsQ.isFetchingNextPage]);
  const handleRetryOps = useCallback(() => void opsQ.refetch(), [opsQ.refetch]);
  const handleRetryGoals = useCallback(() => void goalsQ.refetch(), [goalsQ.refetch]);

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
      ...(values.measuredAt ? { measuredAt: new Date(values.measuredAt).toISOString() } : {}),
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
            options={opsItems}
            isError={opsQ.isError}
            error={opsQ.error}
            onRetry={handleRetryOps}
            onSearchChange={handleOpSearch}
            footer={<InfiniteScrollSentinel hasNextPage={opsQ.hasNextPage} isFetchingNextPage={opsQ.isFetchingNextPage}
              onLoadMore={handleFetchOpsNext} label="Load more opportunities" />}
          />
          <OutcomeReviewLinkField
            control={form.control}
            name="goalId"
            label="Goal"
            options={goalsItems}
            isError={goalsQ.isError}
            error={goalsQ.error}
            onRetry={handleRetryGoals}
            onSearchChange={handleGoalsSearch}
          />
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
          <OutcomeReviewMeasurementFields control={form.control} />
        </div>
      )}
    </EntityFormSheet>
  );
}
