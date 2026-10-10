"use client";

import { useId } from "react";
import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import { computeRiceScore, formatRiceScore } from "./rice-formula";
import type { RiceFormValues } from "./opportunity-rice-schema";

const REACH_PERIOD_OPTIONS = [
  { label: "Per month", value: "month" },
  { label: "Per quarter", value: "quarter" },
  { label: "Per year", value: "year" },
];

const IMPACT_OPTIONS = [
  { label: "Minimal (0.25)", value: "0.25" },
  { label: "Low (0.5)", value: "0.5" },
  { label: "Medium (1)", value: "1" },
  { label: "High (2)", value: "2" },
  { label: "Massive (3)", value: "3" },
];

const EFFORT_UNIT_OPTIONS = [
  { label: "Person-days", value: "person_days" },
  { label: "Person-weeks", value: "person_weeks" },
  { label: "Person-months", value: "person_months" },
];

export function OpportunityRiceFormFields() {
  const form = useFormContext<RiceFormValues>();
  const watchedValues = form.watch();
  const previewId = useId();

  const reach = watchedValues.reach ?? "";
  const impact = Number(watchedValues.impact ?? 0);
  const confidence = watchedValues.confidence ?? 0;
  const effort = Number(watchedValues.effort ?? 0);
  const reachPeriod = (watchedValues.reachPeriod ?? "month") as "month" | "quarter" | "year";
  const effortUnit = (watchedValues.effortUnit ?? "person_days") as "person_days" | "person_weeks" | "person_months";

  const hasAllFields =
    reach.trim() !== "" &&
    !Number.isNaN(impact) &&
    impact > 0 &&
    !Number.isNaN(confidence) &&
    !Number.isNaN(effort) &&
    effort > 0;

  const preview = hasAllFields
    ? computeRiceScore({ reach, reachPeriod, impact, confidence, effort, effortUnit })
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="reach"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reach</FormLabel>
              <Input {...field} type="number" min={0} className={FIELD_CONTROL_CLASS} placeholder="e.g. 500" />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reachPeriod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={FIELD_CONTROL_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REACH_PERIOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="impact"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Impact</FormLabel>
            <Select value={String(field.value ?? "")} onValueChange={(v) => field.onChange(Number(v))}>
              <SelectTrigger className={FIELD_CONTROL_CLASS}>
                <SelectValue placeholder="Select impact" />
              </SelectTrigger>
              <SelectContent>
                {IMPACT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="confidence"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Confidence (0–1)</FormLabel>
            <Input
              {...field}
              type="number"
              min={0}
              max={1}
              step={0.1}
              className={FIELD_CONTROL_CLASS}
              placeholder="e.g. 0.8"
              onChange={(e) => field.onChange(Number(e.target.value))}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="effort"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Effort</FormLabel>
              <Input
                {...field}
                type="number"
                min={0.1}
                step={0.5}
                className={FIELD_CONTROL_CLASS}
                placeholder="e.g. 10"
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="effortUnit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={FIELD_CONTROL_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EFFORT_UNIT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div
        id={previewId}
        className="rounded-md border border-border bg-muted/30 p-3"
        data-testid="rice-score-preview"
      >
        <span className="text-xs text-muted-foreground">Live RICE score: </span>
        <span className="font-mono text-sm font-semibold tabular-nums" data-testid="rice-score-value">
          {hasAllFields ? formatRiceScore(preview) : "Unscored"}
        </span>
      </div>
    </div>
  );
}
