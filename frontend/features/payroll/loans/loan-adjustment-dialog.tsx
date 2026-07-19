"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCreateLoanAdjustment } from "@/hooks/api/payroll/loan-adjustments";
import type { LoanAdjustmentType } from "@/types/payroll";

const AMOUNT_REQUIRED_TYPES: LoanAdjustmentType[] = ["EXTRA_RECOVERY", "MANUAL_ADJUST"];

const TYPE_LABELS: Record<LoanAdjustmentType, string> = {
  SKIP_EMI: "Skip EMI",
  EXTRA_RECOVERY: "Extra Recovery",
  FORECLOSURE: "Foreclosure",
  MANUAL_ADJUST: "Manual Adjustment",
};

const adjustmentSchema = z.object({
  type: z.enum(["SKIP_EMI", "EXTRA_RECOVERY", "FORECLOSURE", "MANUAL_ADJUST"]),
  amountStr: z.string().optional(),
  reason: z.string().min(1, "Reason is required"),
});

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

export interface LoanAdjustmentDialogProps {
  loanId: number;
  loanEmployeeName: string;
  runId: number | null;
  open: boolean;
  onClose: () => void;
  defaultType?: LoanAdjustmentType;
}

export function LoanAdjustmentDialog({
  loanId,
  loanEmployeeName,
  runId,
  open,
  onClose,
  defaultType,
}: LoanAdjustmentDialogProps) {
  const { mutate, isPending } = useCreateLoanAdjustment();

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      type: defaultType ?? "SKIP_EMI",
      amountStr: "",
      reason: "",
    },
  });

  const { reset } = form;
  const watchedType = form.watch("type");
  const needsAmount = AMOUNT_REQUIRED_TYPES.includes(watchedType);

  useEffect(() => {
    if (open) {
      reset({ type: defaultType ?? "SKIP_EMI", amountStr: "", reason: "" });
    }
  }, [open, defaultType, reset]);

  function handleOpenChange(value: boolean) {
    if (!value) onClose();
  }

  function handleSubmit(values: AdjustmentFormValues) {
    if (!runId) return;
    let amount: number | undefined;
    if (AMOUNT_REQUIRED_TYPES.includes(values.type)) {
      const parsed = parseFloat(values.amountStr ?? "");
      if (isNaN(parsed) || parsed <= 0) {
        form.setError("amountStr", { message: "Amount must be greater than 0" });
        return;
      }
      amount = parsed;
    }
    mutate(
      { runId, loanId, type: values.type, amount, reason: values.reason },
      {
        onSuccess: () => {
          toast.success("Loan adjustment created");
          onClose();
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1 min-w-0">
            <span className="shrink-0">Loan Adjustment —</span>
            <TruncatedText text={loanEmployeeName} className="min-w-0 flex-1" />
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(TYPE_LABELS) as LoanAdjustmentType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {needsAmount && (
              <FormField
                control={form.control}
                name="amountStr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" min={0.01} step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter reason for adjustment…" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={isPending} disabled={isPending || !runId} loadingText="Submitting…">
                Submit
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
