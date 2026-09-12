"use client";

import { memo } from "react";
import { Trash2Icon } from "@animateicons/react/lucide";
import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import type { SimulatorFormValues } from "./simulator-schema";

type ScenarioNumericField =
  | "demandMultiplier"
  | "leadTimeWeeks"
  | "leadTimeStdDevWeeks"
  | "serviceLevelPercent";

const NUMERIC_FIELDS: ReadonlyArray<{
  name: ScenarioNumericField;
  label: string;
  placeholder: string;
}> = [
  { name: "demandMultiplier", label: "Demand ×", placeholder: "measured" },
  { name: "leadTimeWeeks", label: "Lead time (wk)", placeholder: "measured" },
  { name: "leadTimeStdDevWeeks", label: "Lead-time σ (wk)", placeholder: "measured" },
  { name: "serviceLevelPercent", label: "Service level %", placeholder: "base" },
];

interface SimulatorScenarioFieldsProps {
  form: UseFormReturn<SimulatorFormValues>;
  index: number;
  canRemove: boolean;
  onRemove: (index: number) => void;
}

export const SimulatorScenarioFields = memo(function SimulatorScenarioFields({
  form,
  index,
  canRemove,
  onRemove,
}: SimulatorScenarioFieldsProps) {
  function handleRemove(): void {
    onRemove(index);
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-end gap-2">
        <FormField
          control={form.control}
          name={`scenarios.${index}.label`}
          render={({ field }) => (
            <FormItem className="min-w-0 flex-1">
              <FormLabel className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                Scenario
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="What if…" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <AnimatedIconButton
          icon={Trash2Icon}
          iconSize={16}
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={!canRemove}
          onClick={handleRemove}
          aria-label={`Remove scenario ${index + 1}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {NUMERIC_FIELDS.map((numeric) => (
          <FormField
            key={numeric.name}
            control={form.control}
            name={`scenarios.${index}.${numeric.name}`}
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel className="text-micro font-medium text-muted-foreground">
                  {numeric.label}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="decimal"
                    className="font-mono tabular-nums"
                    placeholder={numeric.placeholder}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  );
});
