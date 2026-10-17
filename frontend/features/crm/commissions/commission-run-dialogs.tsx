"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCalculateCommission,
  useCommissionPlans,
  useRebuildCommissionAccrual,
} from "@/hooks/api/crm/commission";
import { useDeals } from "@/hooks/api/crm/deals";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  calculateSchema,
  rebuildSchema,
  type CalculateValues,
  type RebuildValues,
} from "./commission-plan-dialogs-schema";

interface RunDialogProps {
  onOpenChange: (open: boolean) => void;
}

/**
 * Compute the commission one won deal earned. Seals the plan version it used,
 * which is why it is its own permission and not a side effect of reading.
 */
const DEAL_PICKER_LIMIT = 25;

interface DealPickerProps {
  value: string;
  onChange: (value: string) => void;
}

/** Searches the whole book server-side; the chosen deal stays labelled after the search clears. */
function DealPicker({ value, onChange }: DealPickerProps) {
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<ComboboxOption | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const deals = useDeals({ search: debouncedSearch || undefined, limit: DEAL_PICKER_LIMIT });
  const options = useMemo<ComboboxOption[]>(() => {
    const found = (deals.data ?? []).map((deal) => ({ value: String(deal.id), label: deal.name, sublabel: deal.stage }));
    return chosen && chosen.value === value && !found.some((option) => option.value === chosen.value)
      ? [chosen, ...found]
      : found;
  }, [deals.data, chosen, value]);
  const handleChange = useCallback(
    (next: string) => {
      setChosen(options.find((option) => option.value === next) ?? null);
      onChange(next);
    },
    [options, onChange],
  );

  return (
    <Combobox
      options={options}
      value={value}
      onChange={handleChange}
      onSearchChange={setSearch}
      placeholder="Choose a deal…"
      searchPlaceholder="Search deals by name…"
      emptyText={deals.isFetching ? "Searching deals…" : "No deals found."}
      aria-label="Deal"
    />
  );
}

/**
 * Compute the commission one won deal earned. Seals the plan version it used,
 * which is why it is its own permission and not a side effect of reading.
 */
export function CalculateCommissionDialog({ onOpenChange }: RunDialogProps) {
  const calculate = useCalculateCommission();
  const handleSubmit = (values: CalculateValues) =>
    calculate.mutate(Number(values.dealId), {
      onSuccess: (result) => {
        toast.success(result.created ? "Commission calculated" : "Already calculated — showing the existing earning");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });

  return (
    <EntityFormDialog<CalculateValues>
      open
      onOpenChange={onOpenChange}
      title="Calculate commission"
      description="Computes the earning for a won deal under the plan version in force on its close date, and seals that version."
      resolver={zodResolver(calculateSchema)}
      defaultValues={{ dealId: "" }}
      onSubmit={handleSubmit}
      isSubmitting={calculate.isPending}
      submitLabel="Calculate"
    >
      {(form) => (
        <FormField
          control={form.control}
          name="dealId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deal</FormLabel>
              <FormControl>
                <DealPicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </EntityFormDialog>
  );
}

const ALL_PLANS = "all";

/** Re-derive the accrual decomposition over a range. Amounts never change. */
export function RebuildAccrualDialog({ onOpenChange }: RunDialogProps) {
  const rebuild = useRebuildCommissionAccrual();
  const plans = useCommissionPlans();
  const today = new Date().toISOString().slice(0, 10);
  const handleSubmit = (values: RebuildValues) =>
    rebuild.mutate(
      { from: values.from, to: values.to, ...(values.planId !== ALL_PLANS ? { planId: values.planId } : {}) },
      {
        onSuccess: (result) => {
          const drift = result.drifted.length > 0 ? `; ${result.drifted.length} no longer reproduce their total` : "";
          toast.success(`Rebuilt ${result.rebuilt} of ${result.examined} earnings${drift}`);
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );

  return (
    <EntityFormDialog<RebuildValues>
      open
      onOpenChange={onOpenChange}
      title="Rebuild accrual"
      description="Rewrites the per-deal and per-tier breakdown for up to 200 earnings in the range. What anyone is owed does not change."
      resolver={zodResolver(rebuildSchema)}
      defaultValues={{ from: `${today.slice(0, 8)}01`, to: today, planId: ALL_PLANS }}
      onSubmit={handleSubmit}
      isSubmitting={rebuild.isPending}
      submitLabel="Rebuild"
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="from"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From</FormLabel>
                <DatePicker value={field.value} onChange={field.onChange} ariaLabel="From" />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To</FormLabel>
                <DatePicker value={field.value} onChange={field.onChange} ariaLabel="To" />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="planId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plan</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger aria-label="Plan">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    <SelectItem value={ALL_PLANS}>All plans</SelectItem>
                    {(plans.data ?? []).map((plan) => (
                      <SelectItem key={plan.planId} value={plan.planId}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Leave on all plans unless one plan&apos;s breakdown is in question.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
