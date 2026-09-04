"use client";

import { useFieldArray, Controller, type UseFormReturn } from "react-hook-form";
import { Plus } from "lucide-react";
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
import { type ScenarioForm } from "./scenario-schema";
import { NumInput, SpendItemRow } from "./scenario-form-rows";

const KIND_OPTIONS = [
  { value: "CONSERVATIVE", label: "Conservative" },
  { value: "EXPECTED", label: "Expected" },
  { value: "AGGRESSIVE", label: "Aggressive" },
  { value: "CUSTOM", label: "Custom" },
] as const;

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
