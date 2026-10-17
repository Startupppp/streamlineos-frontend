"use client";

import type { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import { DatePicker } from "@/components/ui/date-picker";
import {
  MEASURE_KIND_OPTIONS,
  type ScheduleOutcomeReviewValues,
} from "./outcome-review-form-schema";

interface OutcomeReviewMeasurementFieldsProps {
  control: Control<ScheduleOutcomeReviewValues>;
}

export function OutcomeReviewMeasurementFields({ control }: OutcomeReviewMeasurementFieldsProps) {
  return (
    <>
      <FormField
        control={control}
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
        control={control}
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
        control={control}
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
      <FormField
        control={control}
        name="measuredAt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Measured at</FormLabel>
            <DatePicker
              id="scheduleMeasuredAt"
              value={field.value ?? ""}
              onChange={field.onChange}
              clearable
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
