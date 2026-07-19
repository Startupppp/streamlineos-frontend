"use client";

import { useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRecordPayment } from "@/hooks/api/invoice";
import { useManualMethods } from "@/hooks/api/payments";
import type { PaymentMethod } from "@/types/invoice";
import { useMemo } from "react";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const schema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0, {
      message: "Enter a valid positive amount",
    }),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  referenceNumber: z.string(),
  notes: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface RecordPaymentDialogProps {
  open: boolean;
  invoiceId: number;
  outstanding: number;
  onOpenChange: (open: boolean) => void;
}

export function RecordPaymentDialog({
  open,
  invoiceId,
  outstanding,
  onOpenChange,
}: RecordPaymentDialogProps) {
  const recordPayment = useRecordPayment();
  const { data: manualMethods } = useManualMethods();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: "",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: "bank_transfer",
      referenceNumber: "",
      notes: "",
    },
  });

  const watchedMethod = form.watch("paymentMethod");

  const orderedMethods = useMemo(() => {
    const configuredTypes = new Set<string>(
      (manualMethods ?? []).filter((m) => m.status === "enabled").map((m) => m.methodType),
    );
    return [...PAYMENT_METHODS].sort(
      (a, b) => Number(configuredTypes.has(b.value)) - Number(configuredTypes.has(a.value)),
    );
  }, [manualMethods]);

  const selectedMethodConfig = manualMethods?.find(
    (m) => m.methodType === watchedMethod && m.status === "enabled",
  );

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  function handleSubmit(values: FormValues) {
    recordPayment.mutate(
      {
        invoiceId,
        amount: Number(values.amount),
        paymentDate: values.paymentDate,
        paymentMethod: values.paymentMethod as PaymentMethod,
        referenceNumber: values.referenceNumber || undefined,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Payment recorded");
          onOpenChange(false);
          form.reset({
            amount: "",
            paymentDate: format(new Date(), "yyyy-MM-dd"),
            paymentMethod: "bank_transfer",
            referenceNumber: "",
            notes: "",
          });
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 py-1">
          <div className="space-y-1">
            <Label htmlFor="pay-amount" className="text-xs">
              Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pay-amount"
              type="text"
              inputMode="decimal"
              placeholder={`Max: ${fmt(Math.max(0, outstanding))}`}
              className="text-sm"
              autoFocus
              {...form.register("amount")}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="pay-date" className="text-xs">
              Payment Date <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <DatePicker
                  id="pay-date"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select payment date"
                />
              )}
            />
            {form.formState.errors.paymentDate && (
              <p className="text-xs text-destructive">
                {form.formState.errors.paymentDate.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Payment Method <span className="text-destructive">*</span></Label>
            <Controller
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Payment method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {orderedMethods.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {selectedMethodConfig && (
              <p className="text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1.5 mt-1">
                {selectedMethodConfig.instructions ||
                  (selectedMethodConfig.upiId && `UPI: ${selectedMethodConfig.upiId}`) ||
                  (selectedMethodConfig.bankName &&
                    `${selectedMethodConfig.bankName} — ${selectedMethodConfig.accountHolder} (${selectedMethodConfig.maskedAccountNumber})`)}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="pay-ref" className="text-xs">
              Reference Number
            </Label>
            <Input
              id="pay-ref"
              placeholder="UTR, cheque #, etc."
              className="text-sm"
              {...form.register("referenceNumber")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pay-notes" className="text-xs">
              Notes
            </Label>
            <Input
              id="pay-notes"
              placeholder="Optional"
              className="text-sm"
              {...form.register("notes")}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              size="sm"
              isPending={recordPayment.isPending}
              loadingText="Recording…"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Record Payment
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
