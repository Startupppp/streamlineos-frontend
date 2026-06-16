"use client";

import { format } from "date-fns";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useRecordPayment } from "@/lib/api/hooks/invoice";
import type { PaymentMethod } from "@/types/invoice";
import { useState } from "react";

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

  const [form, setForm] = useState({
    amount: "",
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    paymentMethod: "bank_transfer" as PaymentMethod,
    referenceNumber: "",
    notes: "",
  });

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, amount: e.target.value }));
  }

  function handleDateChange(v: string) {
    setForm((p) => ({ ...p, paymentDate: v }));
  }

  function handleMethodChange(v: string) {
    setForm((p) => ({ ...p, paymentMethod: v as PaymentMethod }));
  }

  function handleRefChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, referenceNumber: e.target.value }));
  }

  function handleNotesChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, notes: e.target.value }));
  }

  function handleSubmit() {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    recordPayment.mutate(
      {
        invoiceId,
        amount,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber || undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Payment recorded");
          onOpenChange(false);
          setForm({
            amount: "",
            paymentDate: format(new Date(), "yyyy-MM-dd"),
            paymentMethod: "bank_transfer",
            referenceNumber: "",
            notes: "",
          });
        },
        onError: () => toast.error("Failed to record payment"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label htmlFor="pay-amount" className="text-xs">
              Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pay-amount"
              type="number"
              step="0.01"
              placeholder={`Max: ${fmt(Math.max(0, outstanding))}`}
              value={form.amount}
              onChange={handleAmountChange}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pay-date" className="text-xs">
              Payment Date
            </Label>
            <DatePicker
              id="pay-date"
              value={form.paymentDate}
              onChange={handleDateChange}
              placeholder="Select payment date"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={handleMethodChange}>
              <SelectTrigger className="h-8 text-xs" aria-label="Payment method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pay-ref" className="text-xs">
              Reference Number
            </Label>
            <Input
              id="pay-ref"
              placeholder="UTR, cheque #, etc."
              value={form.referenceNumber}
              onChange={handleRefChange}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pay-notes" className="text-xs">
              Notes
            </Label>
            <Input
              id="pay-notes"
              placeholder="Optional"
              value={form.notes}
              onChange={handleNotesChange}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={recordPayment.isPending}>
            {recordPayment.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Check className="h-3.5 w-3.5 mr-1" />
            )}
            Record Payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
