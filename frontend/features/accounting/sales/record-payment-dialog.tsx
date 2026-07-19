"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2Icon, PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { DatePicker } from "@/components/ui/date-picker";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRecordPaymentWithAllocations } from "@/hooks/api/accounting/ar";
import type { UseFormRegister } from "react-hook-form";

export interface PayableInvoice {
  id: number;
  invoiceNumber: string;
  total: string;
  amountPaid: string;
  currency: string;
}

const allocationSchema = z.object({
  invoiceId: z.number(),
  amount: z.number().positive(),
});

const schema = z.object({
  amount: z.number().positive("Amount must be positive"),
  paymentDate: z.string().min(1, "Date is required"),
  paymentMethod: z.string().min(1, "Method is required"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  allocations: z.array(allocationSchema).optional(),
});

type FormValues = z.infer<typeof schema>;

interface AllocationRowProps {
  index: number;
  register: UseFormRegister<FormValues>;
  onRemove: (index: number) => void;
}

function AllocationRow({ index, register, onRemove }: AllocationRowProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleRemove(): void {
    onRemove(index);
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        step="0.01"
        min="0.01"
        className="text-xs flex-1"
        placeholder="Amount"
        {...register(`allocations.${index}.amount`)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="w-7 shrink-0"
        onClick={handleRemove}
        {...hoverHandlers}
      >
        <Trash2Icon ref={iconRef} className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface AddAllocationButtonProps {
  onClick: () => void;
}

function AddAllocationButton({ onClick }: AddAllocationButtonProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-xs gap-1"
      onClick={onClick}
      {...hoverHandlers}
    >
      <PlusIcon ref={iconRef} className="h-3 w-3" />
      Add allocation
    </Button>
  );
}

interface RecordPaymentDialogProps {
  invoice: PayableInvoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  cheque: "Cheque",
  cash: "Cash",
  card: "Card",
  other: "Other",
};

export function RecordPaymentDialog({
  invoice,
  open,
  onOpenChange,
}: RecordPaymentDialogProps) {
  const mutation = useRecordPaymentWithAllocations();

  const balanceDue = Math.max(
    0,
    Number(invoice.total) - Number(invoice.amountPaid ?? "0"),
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: balanceDue > 0 ? balanceDue : undefined,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "bank_transfer",
      referenceNumber: "",
      notes: "",
      allocations: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "allocations",
  });

  function handleClose(): void {
    form.reset();
    onOpenChange(false);
  }

  function handleSubmit(values: FormValues): void {
    mutation.mutate(
      { invoiceId: invoice.id, ...values },
      {
        onSuccess: () => {
          toast.success("Payment recorded");
          handleClose();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleAddAllocation(): void {
    append({ invoiceId: invoice.id, amount: 0 });
  }

  function handleRemoveAllocation(index: number): void {
    remove(index);
  }

  function handleDateChange(value: string): void {
    form.setValue("paymentDate", value);
  }

  function handleMethodChange(value: string): void {
    form.setValue("paymentMethod", value);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment — {invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>

        <form
          id="record-payment-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amount" className="text-xs">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                className="text-sm"
                {...form.register("amount", { valueAsNumber: true })}
              />
              {form.formState.errors.amount && (
                <p className="text-[10px] text-destructive">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Payment Date <span className="text-destructive">*</span></Label>
              <DatePicker
                value={form.watch("paymentDate")}
                onChange={handleDateChange}
                className="text-sm w-full"
              />
              {form.formState.errors.paymentDate && (
                <p className="text-[10px] text-destructive">{form.formState.errors.paymentDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Payment Method <span className="text-destructive">*</span></Label>
            <Select
              value={form.watch("paymentMethod")}
              onValueChange={handleMethodChange}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.paymentMethod && (
              <p className="text-[10px] text-destructive">{form.formState.errors.paymentMethod.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="referenceNumber" className="text-xs">
              Reference # (optional)
            </Label>
            <Input
              id="referenceNumber"
              className="text-sm"
              placeholder="e.g. TXN-12345"
              {...form.register("referenceNumber")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              rows={2}
              className="text-sm resize-none"
              {...form.register("notes")}
            />
          </div>

          {fields.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Allocations</Label>
              {fields.map((field, index) => (
                <AllocationRow
                  key={field.id}
                  index={index}
                  register={form.register}
                  onRemove={handleRemoveAllocation}
                />
              ))}
            </div>
          )}

          <AddAllocationButton onClick={handleAddAllocation} />
        </form>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="record-payment-form"
            size="sm"
            isPending={mutation.isPending}
            loadingText="Saving…"
          >
            Record Payment
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
