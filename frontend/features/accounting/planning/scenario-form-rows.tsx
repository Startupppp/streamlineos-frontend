"use client";

import { type ChangeEvent } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ScenarioForm } from "./scenario-schema";

/**
 * The two row-level controls a planning scenario is built from: a bounded
 * numeric input and one planned-spend line.
 *
 * `scenario-form-fields.tsx` composes them and owns the field array; these own
 * the coercion — an empty numeric input must become `0` rather than `NaN`, and a
 * percentage has to stay inside its bounds — which is the part worth reading on
 * its own.
 */

interface NumInputProps {
  label: string;
  name: "collectionRatePct" | "payDelayDays" | "revenueGrowthPct";
  form: UseFormReturn<ScenarioForm>;
  min?: number;
  max?: number;
  float?: boolean;
}

export function NumInput({ label, name, form, min, max, float }: NumInputProps) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        function handleChange(e: ChangeEvent<HTMLInputElement>): void {
          const v = float ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
          field.onChange(Number.isNaN(v) ? 0 : v);
        }
        return (
          <div className="space-y-1">
            <Label className="text-xs font-medium">{label}</Label>
            <Input
              type="number"
              value={field.value}
              onChange={handleChange}
              min={min}
              max={max}
              className="text-sm"
            />
            {fieldState.error?.message && (
              <p className="text-xs text-destructive">{fieldState.error.message}</p>
            )}
          </div>
        );
      }}
    />
  );
}

interface SpendItemRowProps {
  idx: number;
  itemId: string;
  form: UseFormReturn<ScenarioForm>;
  onRemove: (idx: number) => void;
}

export function SpendItemRow({ idx, itemId, form, onRemove }: SpendItemRowProps) {
  function handleRemove(): void {
    onRemove(idx);
  }

  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          onClick={handleRemove}
          aria-label={`Remove item ${idx + 1}`}
        >
          <Trash2 className="size-3" aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Label</Label>
        <Input {...form.register(`plannedSpend.${idx}.label`)} placeholder="e.g. Office rent" className="text-xs" />
        {form.formState.errors.plannedSpend?.[idx]?.label?.message && (
          <p className="text-xs text-destructive">
            {form.formState.errors.plannedSpend[idx].label.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Controller
          control={form.control}
          name={`plannedSpend.${idx}.amount`}
          render={({ field: f, fieldState }) => {
            function handleAmountChange(e: ChangeEvent<HTMLInputElement>): void {
              f.onChange(parseFloat(e.target.value) || 0);
            }
            return (
              <div className="space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  value={f.value}
                  onChange={handleAmountChange}
                  min={0}
                  className="text-xs"
                />
                {fieldState.error?.message && (
                  <p className="text-xs text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            );
          }}
        />
        <Controller
          control={form.control}
          name={`plannedSpend.${idx}.startWeek`}
          render={({ field: f, fieldState }) => {
            function handleWeekChange(e: ChangeEvent<HTMLInputElement>): void {
              f.onChange(parseInt(e.target.value, 10) || 0);
            }
            return (
              <div className="space-y-1">
                <Label className="text-xs">Start Week</Label>
                <Input
                  type="number"
                  value={f.value}
                  onChange={handleWeekChange}
                  min={0}
                  max={51}
                  className="text-xs"
                />
                {fieldState.error?.message && (
                  <p className="text-xs text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            );
          }}
        />
      </div>

      <Controller
        control={form.control}
        name={`plannedSpend.${idx}.recurringWeekly`}
        render={({ field: f }) => (
          <div className="flex items-center gap-2">
            <Checkbox id={`recurring-${itemId}`} checked={f.value} onCheckedChange={f.onChange} />
            <Label htmlFor={`recurring-${itemId}`} className="text-xs cursor-pointer">
              Recurring weekly
            </Label>
          </div>
        )}
      />
    </div>
  );
}
