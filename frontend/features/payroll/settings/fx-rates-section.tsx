"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageSection } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateFxRates } from "@/hooks/api/payroll/settings";
import { CURRENCIES } from "@/features/payroll/setup/lib/constants";
import type { PolicyRow, VersionRow } from "@/types/payroll/setup";

type FxRatesSectionProps = {
  policy: PolicyRow;
  activeVersion: VersionRow | null;
};

const fxRatesSchema = z.object({
  rates: z.array(
    z.object({
      currency: z.string().min(1, "Currency required"),
      rate: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
        message: "Must be a positive number",
      }),
    }),
  ),
});

type FxRatesForm = z.infer<typeof fxRatesSchema>;

function serializeRates(raw: unknown): Array<{ currency: string; rate: string }> {
  if (!raw || typeof raw !== "object") return [];
  return Object.entries(raw as Record<string, unknown>)
    .filter(([, v]) => typeof v === "number")
    .map(([currency, rate]) => ({ currency, rate: String(rate) }));
}

const AVAILABLE_CURRENCIES = CURRENCIES.filter((c) => c.value !== "INR");

export function FxRatesSection({ policy, activeVersion }: FxRatesSectionProps) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateFxRates();

  const existingRates = serializeRates(activeVersion?.config?.fxRates);

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<FxRatesForm>({
      resolver: zodResolver(fxRatesSchema),
      defaultValues: { rates: existingRates.length > 0 ? existingRates : [] },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "rates" });

  function handleEdit() {
    reset({ rates: existingRates.length > 0 ? existingRates : [] });
    setEditing(true);
  }

  function handleCancel() {
    reset({ rates: existingRates });
    setEditing(false);
  }

  function handleAddRate() {
    append({ currency: "", rate: "" });
  }

  function handleCurrencyChange(idx: number, val: string) {
    setValue(`rates.${idx}.currency`, val);
  }

  function onSubmit(data: FxRatesForm) {
    const fxRates: Record<string, number> = {};
    for (const row of data.rates) {
      if (row.currency) {
        fxRates[row.currency] = Number(row.rate);
      }
    }
    update.mutate(
      { policyId: policy.id, fxRates },
      {
        onSuccess: () => {
          toast.success("FX rates saved");
          setEditing(false);
        },
        onError: () => toast.error("Failed to save FX rates"),
      },
    );
  }

  const baseCurrency = policy.currency;

  if (!editing) {
    return (
      <PageSection
        title="FX Rates"
        description={`Exchange rates relative to ${baseCurrency} for multi-currency payroll runs`}
        actions={
          <Button variant="outline" size="sm" onClick={handleEdit}>
            Edit
          </Button>
        }
      >
        {existingRates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No FX rates configured. Add rates to enable multi-currency payroll runs.
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {existingRates.map(({ currency, rate }) => (
              <div key={currency}>
                <dt className="text-xs text-muted-foreground">{currency}</dt>
                <dd className="font-mono font-medium mt-0.5 text-sm">
                  1 {baseCurrency} = {rate} {currency}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </PageSection>
    );
  }

  return (
    <PageSection
      title="FX Rates"
      description={`Set exchange rates relative to ${baseCurrency} for multi-currency payroll runs`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col gap-2">
          {fields.map((field, idx) => (
            <div key={field.id} className="flex items-end gap-2">
              <div className="space-y-1 flex-1">
                {idx === 0 && <Label className="text-xs">Currency</Label>}
                <Select
                  value={watch(`rates.${idx}.currency`)}
                  onValueChange={(val) => handleCurrencyChange(idx, val)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.rates?.[idx]?.currency && (
                  <p className="text-xs text-destructive">{errors.rates[idx].currency?.message}</p>
                )}
              </div>
              <div className="space-y-1 flex-1">
                {idx === 0 && (
                  <Label className="text-xs">Rate (1 {baseCurrency} =)</Label>
                )}
                <Input
                  {...register(`rates.${idx}.rate`)}
                  type="number"
                  step="any"
                  min="0"
                  className="text-sm font-mono"
                  placeholder="e.g. 1.12"
                />
                {errors.rates?.[idx]?.rate && (
                  <p className="text-xs text-destructive">{errors.rates[idx].rate?.message}</p>
                )}
              </div>
              <AnimatedIconButton
                icon={Trash2Icon}
                type="button"
                variant="ghost"
                size="icon"
                className="w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(idx)}
                aria-label="Remove rate"
              />
            </div>
          ))}
        </div>

        <AnimatedIconButton
          icon={PlusIcon}
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          iconClassName="mr-1.5"
          onClick={handleAddRate}
        >
          Add Currency
        </AnimatedIconButton>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save Rates"}
          </Button>
        </div>
      </form>
    </PageSection>
  );
}
