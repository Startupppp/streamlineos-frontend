"use client";

import { toast } from "sonner";
import { RecordForm, type RecordFormValues } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { useUpdateQuoteSettings } from "@/hooks/api/crm/pricebooks";
import { getErrorMessage } from "@/lib/get-error-message";
import { QUOTE_SETTINGS_LAYOUT } from "@/lib/renderer/crm/settings/quote-template-layout";
import type { QuoteSettings } from "@/types/crm/pricebooks";
import { flagOrOmit, numberOrNull, numberOrOmit } from "../shared/record-payload";

/**
 * How quoting behaves across the organisation.
 *
 * Generated from a singleton description — there is one of these per tenant and
 * no list of them, which is a shape the vocabulary now admits rather than one it
 * had to be lied to about. The form owns its own mutation because there is
 * nothing else on the page that could: a settings form is the whole surface.
 *
 * A blank maximum discount is `null` — no ceiling — rather than an omission, so
 * clearing the field clears the limit instead of quietly leaving the old one.
 */

interface QuoteSettingsFormProps {
  settings: QuoteSettings | undefined;
}

export function QuoteSettingsForm({ settings }: QuoteSettingsFormProps) {
  const layout = useTenantLayout(QUOTE_SETTINGS_LAYOUT);
  const updateSettings = useUpdateQuoteSettings();

  function handleSubmit(values: RecordFormValues) {
    const patch: Partial<QuoteSettings> = {};

    const defaultExpiryDays = numberOrOmit(values, "defaultExpiryDays");
    if (defaultExpiryDays !== undefined) patch.defaultExpiryDays = defaultExpiryDays;

    const maxDiscountPercent = numberOrNull(values, "maxDiscountPercent");
    if (maxDiscountPercent !== undefined) patch.maxDiscountPercent = maxDiscountPercent;

    const requirePricebookPrice = flagOrOmit(values, "requirePricebookPrice");
    if (requirePricebookPrice !== undefined) patch.requirePricebookPrice = requirePricebookPrice;

    const allowPriceOverride = flagOrOmit(values, "allowPriceOverride");
    if (allowPriceOverride !== undefined) patch.allowPriceOverride = allowPriceOverride;

    updateSettings.mutate(patch, {
      onSuccess: () => toast.success("Quoting rules saved"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <RecordForm
      key={settings ? "loaded" : "empty"}
      layout={layout}
      mode="edit"
      initial={{
        defaultExpiryDays: settings?.defaultExpiryDays ?? 30,
        maxDiscountPercent: settings?.maxDiscountPercent ?? "",
        requirePricebookPrice: settings?.requirePricebookPrice ?? false,
        allowPriceOverride: settings?.allowPriceOverride ?? true,
      }}
      onSubmit={handleSubmit}
      isSubmitting={updateSettings.isPending}
      submitLabel="Save quoting rules"
    />
  );
}
