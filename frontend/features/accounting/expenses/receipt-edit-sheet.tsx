"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePatchReceiptMetadata } from "@/hooks/api/accounting/expenses";
import { useCategorizeSuggest } from "@/hooks/api/accounting/insights";
import type { CategorizeSuggestResult } from "@/hooks/api/accounting/insights";
import type { FinReceiptInboxItem } from "@/types/accounting/expenses";

const patchSchema = z.object({
  merchant: z.string().min(1).max(200).optional(),
  receiptNumber: z.string().min(1).max(100).optional(),
  taxAmount: z.string().optional(),
  categoryId: z.number().optional(),
});

type PatchForm = z.infer<typeof patchSchema>;

interface ReceiptEditSheetProps {
  expense: FinReceiptInboxItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptEditSheet({ expense, open, onOpenChange }: ReceiptEditSheetProps) {
  const mutation = usePatchReceiptMetadata(expense.id);
  const suggestMutation = useCategorizeSuggest();
  const [suggestion, setSuggestion] = useState<CategorizeSuggestResult | null>(null);
  const lastSuggestedMerchantRef = useRef<string>("");
  const suggestInFlightRef = useRef(false);

  const form = useForm<PatchForm>({
    resolver: zodResolver(patchSchema),
    defaultValues: {
      merchant: expense.merchant ?? "",
      receiptNumber: expense.receiptNumber ?? "",
      taxAmount: expense.taxAmount ?? "",
    },
  });

  const merchantValue = form.watch("merchant");

  useEffect(() => {
    const merchant = merchantValue?.trim() ?? "";
    if (!merchant || merchant === lastSuggestedMerchantRef.current || suggestInFlightRef.current) return;
    suggestInFlightRef.current = true;
    lastSuggestedMerchantRef.current = merchant;
    suggestMutation.mutate(
      { merchant },
      {
        onSuccess: (result) => {
          setSuggestion(result);
          suggestInFlightRef.current = false;
        },
        onError: () => {
          suggestInFlightRef.current = false;
        },
      },
    );
  }, [merchantValue, suggestMutation]);

  const handleApplySuggestion = useCallback(() => {
    if (!suggestion) return;
    form.setValue("categoryId", suggestion.categoryId);
    toast.success(`Category set to ${suggestion.categoryName}`);
  }, [form, suggestion]);

  const handleSubmit = useCallback(
    (values: PatchForm) => {
      const payload: Parameters<typeof mutation.mutate>[0] = {};
      if (values.merchant) payload.merchant = values.merchant;
      if (values.receiptNumber) payload.receiptNumber = values.receiptNumber;
      if (values.taxAmount) payload.taxAmount = parseFloat(values.taxAmount);
      if (values.categoryId !== undefined) payload.categoryId = values.categoryId;

      mutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Receipt metadata updated");
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [mutation, onOpenChange],
  );

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Receipt Metadata"
      description="Correct OCR-extracted fields before processing"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={handleCancel} disabled={mutation.isPending}>
            Cancel
          </Button>
          <LoadingButton
            className="flex-1"
            isPending={mutation.isPending}
            onClick={form.handleSubmit(handleSubmit)}
          >
            Save
          </LoadingButton>
        </>
      }
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label className="text-xs">Merchant</Label>
          <Input {...form.register("merchant")} className="h-8 text-sm" placeholder="Merchant name" />
          {form.formState.errors.merchant && (
            <p className="text-xs text-destructive">{form.formState.errors.merchant.message}</p>
          )}
          {suggestion && suggestion.basis === "history" && (
            <button
              type="button"
              onClick={handleApplySuggestion}
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs text-blue-700 hover:bg-blue-100 transition-colors dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10"
            >
              Suggested: {suggestion.categoryName} ({suggestion.confidence}%)
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Receipt Number</Label>
          <Input {...form.register("receiptNumber")} className="h-8 text-sm" placeholder="INV-001" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tax Amount</Label>
          <Input
            {...form.register("taxAmount")}
            type="number"
            step="0.01"
            min="0"
            className="h-8 text-sm"
            placeholder="0.00"
          />
        </div>
      </form>
    </AppSheet>
  );
}
