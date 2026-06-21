"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecordVendorPayment } from "@/lib/api/hooks/accounting";

const PAYMENT_METHODS = ["bank_transfer", "upi", "cheque", "cash", "card", "other"] as const;

const schema = z.object({
  amount: z
    .string()
    .min(1, "Amount required")
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, "Amount must be > 0")
    .refine((v) => Number(v) <= 999999999.99, "Amount too large"),
  paymentDate: z.string().min(1, "Payment date required"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

type RecordVendorPaymentValues = z.infer<typeof schema>;

interface Props {
  billId: number;
  billNumber: string;
  remaining: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const PAYMENT_METHOD_LABEL: Record<typeof PAYMENT_METHODS[number], string> = {
  bank_transfer: "Bank transfer",
  upi: "UPI",
  cheque: "Cheque",
  cash: "Cash",
  card: "Card",
  other: "Other",
};

export function RecordVendorPaymentDialog({ billId, billNumber, remaining, open, onOpenChange }: Props) {
  const mutation = useRecordVendorPayment(billId);

  const defaultValues: RecordVendorPaymentValues = {
    amount: remaining > 0 ? remaining.toFixed(2) : "",
    paymentDate: todayIso(),
    paymentMethod: "bank_transfer",
    referenceNumber: "",
    notes: "",
  };

  async function handleSubmit(values: RecordVendorPaymentValues): Promise<void> {
    try {
      const payload = {
        amount: Number(values.amount),
        paymentDate: values.paymentDate,
        paymentMethod: values.paymentMethod,
        referenceNumber: values.referenceNumber ? values.referenceNumber : undefined,
        notes: values.notes ? values.notes : undefined,
      };
      await mutation.mutateAsync(payload);
      toast.success(`Payment recorded for ${billNumber}`);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to record payment";
      toast.error(message);
    }
  }

  return (
    <EntityFormDialog<RecordVendorPaymentValues>
      open={open}
      onOpenChange={onOpenChange}
      title={`Record payment — ${billNumber}`}
      description={`Outstanding: ${remaining.toFixed(2)}`}
      resolver={zodResolver(schema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={mutation.isPending}
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Method</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="referenceNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference #</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="UTR, cheque #, txn id" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ""} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
