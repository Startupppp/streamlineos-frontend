"use client";

import { type ChangeEvent } from "react";
import { useFieldArray, Controller, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const scenarioSchema = z.object({
  name: z.string().min(1, "Name required"),
  kind: z.enum(["CONSERVATIVE", "EXPECTED", "AGGRESSIVE", "CUSTOM"]),
  isDefault: z.boolean(),
  collectionRatePct: z.number().min(0).max(100),
  payDelayDays: z.number().int().min(0).max(90),
  revenueGrowthPct: z.number().min(-100).max(500),
  plannedSpend: z.array(
    z.object({
      label: z.string().min(1),
      amount: z.number().min(0),
      startWeek: z.number().int().min(0).max(51),
      recurringWeekly: z.boolean(),
    }),
  ),
});

export type ScenarioForm = z.infer<typeof scenarioSchema>;

export const CREATE_DEFAULTS: ScenarioForm = {
  name: "",
  kind: "EXPECTED",
  isDefault: false,
  collectionRatePct: 100,
  payDelayDays: 7,
  revenueGrowthPct: 0,
  plannedSpend: [],
};

const KIND_OPTIONS = [
  { value: "CONSERVATIVE", label: "Conservative" },
  { value: "EXPECTED", label: "Expected" },
  { value: "AGGRESSIVE", label: "Aggressive" },
  { value: "CUSTOM", label: "Custom" },
] as const;

interface NumInputProps {
  label: string;
  name: "collectionRatePct" | "payDelayDays" | "revenueGrowthPct";
  form: UseFormReturn<ScenarioForm>;
  min?: number;
  max?: number;
  float?: boolean;
}

function NumInput({ label, name, form, min, max, float }: NumInputProps) {
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

function SpendItemRow({ idx, itemId, form, onRemove }: SpendItemRowProps) {
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
        >
          <Trash2 className="size-3" />
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

export function ScenarioFormFields({
  form,
}: {
  form: UseFormReturn<ScenarioForm>;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "plannedSpend",
  });

  function handleAppend(): void {
    append({ label: "", amount: 0, startWeek: 0, recurringWeekly: false });
  }

  return (
    <>
      <div className="space-y-1">
        <Label className="text-xs font-medium">Name</Label>
        <Input
          {...form.register("name")}
          placeholder="e.g. Base Case Q3"
          className="text-sm"
        />
        {form.formState.errors.name?.message && (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <Controller
        control={form.control}
        name="kind"
        render={({ field, fieldState }) => (
          <div className="space-y-1">
            <Label className="text-xs font-medium">Kind</Label>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select kind" />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.error?.message && (
              <p className="text-xs text-destructive">{fieldState.error.message}</p>
            )}
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="isDefault"
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox id="isDefault" checked={field.value} onCheckedChange={field.onChange} />
            <Label htmlFor="isDefault" className="text-xs font-medium cursor-pointer">
              Set as default scenario
            </Label>
          </div>
        )}
      />

      <div className="pt-1 border-t border-border/50">
        <p className="text-xs font-semibold text-foreground mb-3">Assumptions</p>
        <div className="space-y-3">
          <NumInput label="Collection Rate (%)" name="collectionRatePct" form={form} min={0} max={100} float />
          <NumInput label="Pay Delay (days)" name="payDelayDays" form={form} min={0} max={90} />
          <NumInput label="Revenue Growth (%)" name="revenueGrowthPct" form={form} min={-100} max={500} float />
        </div>
      </div>

      <div className="pt-1 border-t border-border/50">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-foreground">Planned Spend</p>
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={handleAppend}>
            <Plus className="size-3 mr-1" />
            Add Item
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground">No planned spend items.</p>
        )}

        <div className="space-y-3">
          {fields.map((item, idx) => (
            <SpendItemRow
              key={item.id}
              idx={idx}
              itemId={item.id}
              form={form}
              onRemove={remove}
            />
          ))}
        </div>
      </div>
    </>
  );
}
