"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ErrorState } from "@/components/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApplyCreditNote } from "@/hooks/api/accounting/ar";
import { useInvoices } from "@/hooks/api/invoice";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CreditNote } from "@/types/accounting/ar";

const applySchema = z.object({
  invoiceId: z.string().min(1, "Select an invoice"),
  amount: z.string().min(1, "Required"),
});

type ApplyFormValues = z.infer<typeof applySchema>;

interface ApplyCreditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditNote: CreditNote;
}

export function ApplyCreditNoteDialog({
  open,
  onOpenChange,
  creditNote,
}: ApplyCreditNoteDialogProps) {
  const applyMutation = useApplyCreditNote();

  const invoicesQuery = useInvoices({ status: "ISSUED" });
  const allInvoices = invoicesQuery.data?.items ?? [];
  const invoices = creditNote.clientId
    ? allInvoices.filter((inv) => inv.clientId === creditNote.clientId)
    : allInvoices;

  const remaining = Number(creditNote.total) - Number(creditNote.appliedAmount);

  function handleRetryInvoices(): void {
    void invoicesQuery.refetch();
  }

  const form = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
    defaultValues: { invoiceId: "", amount: "" },
  });

  function handleSubmit(values: ApplyFormValues): void {
    applyMutation.mutate(
      { creditNoteId: creditNote.id, invoiceId: Number(values.invoiceId), amount: Number(values.amount) },
      {
        onSuccess: () => {
          toast.success("Credit note applied to invoice");
          onOpenChange(false);
          form.reset();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleCancel(): void {
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply Credit Note</DialogTitle>
          <DialogDescription>
            Apply this credit note to an outstanding invoice. Available: ₹{remaining.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        {/*
          Without this branch a failed invoice read rendered an empty selector,
          which reads as "this customer has no outstanding invoices" — a claim
          about the AR subledger produced by an unanswered request.
        */}
        {invoicesQuery.isError ? (
          <ErrorState
            compact
            title="Couldn't load invoices"
            description={getErrorMessage(invoicesQuery.error)}
            onRetry={handleRetryInvoices}
          />
        ) : (
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-1.5">
            <Label className="text-xs">Invoice <span className="text-destructive">*</span></Label>
            <Controller
              control={form.control}
              name="invoiceId"
              render={({ field, fieldState }) => (
                <>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select invoice…" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices.map((inv) => (
                        <SelectItem key={inv.id} value={String(inv.id)}>
                          {inv.invoiceNumber} — ₹{Number(inv.total).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Amount to apply <span className="text-destructive">*</span></Label>
            <Input
              {...form.register("amount")}
              className="text-sm"
              type="number"
              min="0.01"
              max={remaining}
              step="0.01"
              placeholder={`Max ${remaining.toFixed(2)}`}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>
        </form>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          {!invoicesQuery.isError && (
            <LoadingButton
              size="sm"
              isPending={applyMutation.isPending}
              loadingText="Applying…"
              onClick={form.handleSubmit(handleSubmit)}
            >
              Apply
            </LoadingButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
