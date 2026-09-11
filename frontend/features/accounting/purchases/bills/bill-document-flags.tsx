"use client";

import type { UseFormReturn } from "react-hook-form";
import { Info } from "lucide-react";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import {
  BLOCKED_INPUT_TAX_EXPLAINER,
  REVERSE_CHARGE_EXPLAINER,
} from "../lib/ap-labels";
import type { BillFormValues } from "./bill-form-schema";

interface BillDocumentFlagsProps {
  form: UseFormReturn<BillFormValues>;
}

const infoTone = statusToneClasses("info");

export function FlagExplainer({ text }: { text: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-label",
        infoTone.surface,
        infoTone.ink,
        infoTone.rule,
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </p>
  );
}

export function BillDocumentFlags({ form }: BillDocumentFlagsProps) {
  const reverseCharge = form.watch("reverseCharge");
  const blockedInputTax = form.watch("blockedInputTax");

  return (
    <div className="space-y-3">
      <FormField
        control={form.control}
        name="reverseCharge"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-3">
            <div className="min-w-0">
              <FormLabel>You account for the tax on this purchase</FormLabel>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      {reverseCharge ? <FlagExplainer text={REVERSE_CHARGE_EXPLAINER} /> : null}

      <FormField
        control={form.control}
        name="blockedInputTax"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-3">
            <div className="min-w-0">
              <FormLabel>This tax cannot be reclaimed</FormLabel>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      {blockedInputTax ? <FlagExplainer text={BLOCKED_INPUT_TAX_EXPLAINER} /> : null}

      <FormField
        control={form.control}
        name="taxInclusive"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-3">
            <div className="min-w-0">
              <FormLabel>Line prices already include tax</FormLabel>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
