"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared";
import { parseMoneyInput } from "@/lib/accounting/money";
import { getErrorMessage } from "@/lib/get-error-message";
import { useApDocuments, usePostApPayment } from "@/hooks/api/accounting/ap";
import type {
  ApAllocationInput,
  PostApPaymentInput,
  VendorSummary,
  WithholdingInstruction,
} from "@/types/accounting-ap";
import { todayIso } from "../lib/ap-dates";
import { textOrNull, textOrUndefined } from "../lib/form-values";
import { PaymentFormFields } from "./payment-form-fields";
import { paymentFormSchema, type PaymentFormValues } from "./payment-form-schema";

interface RecordPaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCurrency: string;
}

export function RecordPaymentSheet({
  open,
  onOpenChange,
  defaultCurrency,
}: RecordPaymentSheetProps) {
  const [partyId, setPartyId] = useState("");
  const postPayment = usePostApPayment();

  const openBillsQuery = useApDocuments(
    { documentType: "BILL", partyId, openOnly: true, page: 1, pageSize: 50 },
    { enabled: open && !!partyId },
  );
  const openBills = useMemo(() => openBillsQuery.data?.items ?? [], [openBillsQuery.data]);

  const defaultValues = useMemo<PaymentFormValues>(
    () => ({
      partyId: "",
      paymentDate: todayIso(),
      paymentAccountId: "",
      currency: defaultCurrency,
      grossAmount: "",
      withholdingMode: "auto",
      withholdingCode: "",
      withholdingRatePercent: "",
      withholdingAmount: "",
      withholdingReason: "",
      paymentMethod: "",
      reference: "",
      memo: "",
      amounts: [],
    }),
    [defaultCurrency],
  );

  function buildWithholding(
    values: PaymentFormValues,
    currency: string,
  ): WithholdingInstruction | undefined {
    const code = textOrUndefined(values.withholdingCode);
    if (values.withholdingMode === "auto") return { mode: "auto", code };
    if (values.withholdingMode === "none") return { mode: "none" };

    const ratePercent = textOrUndefined(values.withholdingRatePercent);
    const amount = textOrUndefined(values.withholdingAmount);

    return {
      mode: "manual",
      code,
      rateBp: ratePercent ? Math.round(Number(ratePercent) * 100) : null,
      withheldMinor: amount ? parseMoneyInput(amount, currency) : null,
      reason: textOrUndefined(values.withholdingReason),
    };
  }

  function handleSubmit(values: PaymentFormValues): void {
    const currency = values.currency.toUpperCase();
    const allocations: ApAllocationInput[] = [];
    for (const [index, bill] of openBills.entries()) {
      const raw = values.amounts[index] ?? "";
      const amountMinor = parseMoneyInput(raw.trim() || "0", currency);
      if (amountMinor === null || amountMinor <= 0) continue;
      allocations.push({ documentId: bill.id, amountMinor });
    }

    const grossText = textOrUndefined(values.grossAmount);
    const grossMinor = grossText ? parseMoneyInput(grossText, currency) : null;

    if (grossText && grossMinor === null) {
      toast.error(`Enter a ${currency} amount with the right number of decimals`);
      return;
    }

    if (allocations.length === 0 && grossMinor === null) {
      toast.error("Say which bills this covers, or how much they invoiced");
      return;
    }

    const withholding = buildWithholding(values, currency);

    const payload: PostApPaymentInput = {
      partyId: values.partyId,
      paymentDate: values.paymentDate,
      paymentAccountId: values.paymentAccountId,
      currency,
      allocations,
      withholding,
      paymentMethod: textOrNull(values.paymentMethod),
      reference: textOrNull(values.reference),
      memo: textOrNull(values.memo),
    };
    if (grossMinor !== null) payload.grossMinor = grossMinor;

    postPayment.mutate(payload, {
      onSuccess: () => {
        toast.success("Payment recorded");
        setPartyId("");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleOpenChange(next: boolean): void {
    if (!next) setPartyId("");
    onOpenChange(next);
  }

  return (
    <EntityFormSheet<PaymentFormValues>
      open={open}
      onOpenChange={handleOpenChange}
      title="Pay a vendor"
      description="Money out. Pick who is being paid, which bills it settles, and where it left from."
      resolver={zodResolver(paymentFormSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={postPayment.isPending}
      submitLabel="Record payment"
      resetOnOpen
      className="sm:max-w-2xl"
    >
      {(form) => (
        <PaymentFormFields
          form={form}
          openBills={openBills}
          isLoadingBills={!!partyId && openBillsQuery.isPending}
          onVendorChange={(nextPartyId, vendor: VendorSummary | undefined) => {
            setPartyId(nextPartyId);
            form.setValue("partyId", nextPartyId, { shouldValidate: true });
            form.setValue("amounts", []);
            if (vendor) form.setValue("currency", vendor.defaultCurrency);
          }}
        />
      )}
    </EntityFormSheet>
  );
}
