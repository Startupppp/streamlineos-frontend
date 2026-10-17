"use client";

import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePayrollComponents } from "@/hooks/api/payroll/components";
import { PERCENT_BASE_BASIC, PERCENT_BASE_GROSS, type ComponentForm } from "./lib/component-form-schema";

type PercentOfFieldsProps = {
  form: UseFormReturn<ComponentForm>;
  ownCode: string;
};

export function PercentOfFields({ form, ownCode }: PercentOfFieldsProps) {
  const { data, isError } = usePayrollComponents({ type: "EARNING", active: true, limit: 100 });
  const earnings = (data?.items ?? []).filter(
    (c) => c.code !== "BASIC" && c.code !== ownCode.toUpperCase(),
  );
  const base = form.watch("percentBase") ?? "";
  const unlistedBase =
    base !== "" && base !== PERCENT_BASE_BASIC && base !== PERCENT_BASE_GROSS && !earnings.some((c) => c.code === base);
  const baseComponent = form.watch("type") === "EARNING" ? earnings.find((c) => c.code === base) : undefined;

  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField
        control={form.control}
        name="percent"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-medium">Percentage (%)</FormLabel>
            <FormControl>
              <Input id="comp-percent" {...field} className="text-sm font-mono" placeholder="e.g. 50" />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="percentBase"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-medium">Of</FormLabel>
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pick a base" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={PERCENT_BASE_BASIC}>Basic</SelectItem>
                <SelectItem value={PERCENT_BASE_GROSS}>Gross</SelectItem>
                {unlistedBase ? <SelectItem value={base}>{base}</SelectItem> : null}
                {earnings.map((c) => (
                  <SelectItem key={c.id} value={c.code}>{c.name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
      {isError ? (
        <p className="col-span-2 text-micro text-destructive">
          Couldn&apos;t load earning components. Basic and Gross are still available.
        </p>
      ) : null}
      {baseComponent ? (
        <p className="col-span-2 text-micro text-muted-foreground">
          Payroll computes {baseComponent.name} first, so give this component a sort order above {baseComponent.sortOrder}.
        </p>
      ) : null}
    </div>
  );
}
