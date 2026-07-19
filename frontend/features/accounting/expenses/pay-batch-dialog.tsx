"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePayBatch, useFinBankAccounts } from "@/hooks/api/accounting/expenses";

const paySchema = z.object({
  paidDate: z.string().min(10, "Date is required"),
  bankAccountId: z.string().optional(),
});

type PayForm = z.infer<typeof paySchema>;

interface PayBatchDialogProps {
  batchId: number;
  batchName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void;
}

export function PayBatchDialog({ batchId, batchName, open, onOpenChange, onPaid }: PayBatchDialogProps) {
  const mutation = usePayBatch(batchId);
  const bankAccountsQuery = useFinBankAccounts();

  const form = useForm<PayForm>({
    resolver: zodResolver(paySchema),
    defaultValues: {
      paidDate: new Date().toISOString().split("T")[0] ?? "",
      bankAccountId: "",
    },
  });

  const handleSubmit = useCallback(
    (values: PayForm) => {
      mutation.mutate(
        {
          paidDate: values.paidDate,
          bankAccountId: values.bankAccountId ? parseInt(values.bankAccountId, 10) : undefined,
        },
        {
          onSuccess: () => {
            toast.success("Batch marked as paid");
            onOpenChange(false);
            onPaid();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [mutation, onOpenChange, onPaid],
  );

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleBankAccountChange = useCallback(
    (v: string) => form.setValue("bankAccountId", v),
    [form],
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pay batch: {batchName}</AlertDialogTitle>
          <AlertDialogDescription>
            Record the payment date to mark this batch as paid and post the journal entry.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label className="text-xs">Payment date <span className="text-destructive">*</span></Label>
            <Input {...form.register("paidDate")} type="date" className="text-sm" />
            {form.formState.errors.paidDate && (
              <p className="text-xs text-destructive">{form.formState.errors.paidDate.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bank account (optional)</Label>
            <Select
              value={form.watch("bankAccountId")}
              onValueChange={handleBankAccountChange}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                {(bankAccountsQuery.data ?? [])
                  .filter((a) => a.isActive)
                  .map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </form>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={mutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <LoadingButton
            isPending={mutation.isPending}
            onClick={form.handleSubmit(handleSubmit)}
          >
            Pay batch
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
