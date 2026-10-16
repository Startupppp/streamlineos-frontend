"use client";

import { useCallback } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CommissionPlanFormValues } from "./commission-rules-schema";

interface CommissionRulesFieldsProps {
  form: UseFormReturn<CommissionPlanFormValues>;
  currency: string;
}

const PERIOD_LABEL = { MONTH: "Monthly", QUARTER: "Quarterly", YEAR: "Yearly" } as const;

/** Period, quota, cap, the marginal tier table and the accelerators. */
export function CommissionRulesFields({ form, currency }: CommissionRulesFieldsProps) {
  const tiers = useFieldArray({ control: form.control, name: "rules.tiers" });
  const accelerators = useFieldArray({ control: form.control, name: "rules.accelerators" });
  const quotaBased = form.watch("rules.quota").trim() !== "";

  const handleAddTier = useCallback(() => tiers.append({ from: "", ratePercent: "" }), [tiers]);
  const handleRemoveTier = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => tiers.remove(Number(event.currentTarget.dataset.index)),
    [tiers],
  );
  const handleAddAccelerator = useCallback(
    () => accelerators.append({ abovePercent: "", multiplier: "" }),
    [accelerators],
  );
  const handleRemoveAccelerator = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => accelerators.remove(Number(event.currentTarget.dataset.index)),
    [accelerators],
  );

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold">Rules</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField
          control={form.control}
          name="rules.period"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger aria-label="Period">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {(["MONTH", "QUARTER", "YEAR"] as const).map((period) => (
                    <SelectItem key={period} value={period}>
                      {PERIOD_LABEL[period]}
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
          name="rules.quota"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{`Quota (${currency})`}</FormLabel>
              <FormControl>
                <Input {...field} inputMode="decimal" placeholder="None" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rules.cap"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{`Cap (${currency})`}</FormLabel>
              <FormControl>
                <Input {...field} inputMode="decimal" placeholder="None" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {quotaBased ? "Tiers by attainment (% of quota)" : `Tiers by period total (${currency})`}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={handleAddTier}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add tier
        </Button>
      </div>
      {tiers.fields.map((row, index) => (
        <div key={row.id} className="flex items-start gap-3">
          <FormField
            control={form.control}
            name={`rules.tiers.${index}.from`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Tier starts at</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="decimal" placeholder={quotaBased ? "From %" : "From amount"} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`rules.tiers.${index}.ratePercent`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Rate %</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="decimal" placeholder="Rate %" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove tier"
            data-index={index}
            onClick={handleRemoveTier}
            disabled={tiers.fields.length === 1}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Accelerators (above % of quota, multiplier)</span>
        <Button type="button" variant="outline" size="sm" onClick={handleAddAccelerator}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add accelerator
        </Button>
      </div>
      {accelerators.fields.map((row, index) => (
        <div key={row.id} className="flex items-start gap-3">
          <FormField
            control={form.control}
            name={`rules.accelerators.${index}.abovePercent`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Above % of quota</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="decimal" placeholder="Above %" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`rules.accelerators.${index}.multiplier`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Multiplier</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="decimal" placeholder="e.g. 1.5" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove accelerator"
            data-index={index}
            onClick={handleRemoveAccelerator}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </section>
  );
}
