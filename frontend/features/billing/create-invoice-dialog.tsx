"use client";

import { Controller, useFieldArray, useForm, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateInvoice } from "@/hooks/api/invoice";
import { formatCurrencyFull } from "@/lib/format-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";

const dialogLineItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.number().positive("Qty must be > 0"),
  rate: z.number().nonnegative("Rate must be >= 0"),
});

const createInvoiceDialogSchema = z.object({
  lineItems: z.array(dialogLineItemSchema).min(1, "Add at least one line item"),
  taxRate: z.number().min(0).max(100),
  discount: z.number().min(0),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

type CreateInvoiceDialogValues = z.infer<typeof createInvoiceDialogSchema>;

const DIALOG_DEFAULT_VALUES: CreateInvoiceDialogValues = {
  lineItems: [{ description: "", quantity: 1, rate: 0 }],
  taxRate: 18,
  discount: 0,
  dueDate: "",
  notes: "",
};

interface DialogLineItemErrors {
  description?: string;
  quantity?: string;
  rate?: string;
}

interface DialogLineItemRowProps {
  idx: number;
  amount: number;
  register: UseFormRegister<CreateInvoiceDialogValues>;
  errors: DialogLineItemErrors;
  disabled: boolean;
  onRemove: (idx: number) => void;
}

function DialogLineItemRow({
  idx,
  amount,
  register,
  errors,
  disabled,
  onRemove,
}: DialogLineItemRowProps) {
  function handleRemove() {
    onRemove(idx);
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-start">
      <div className="col-span-5 space-y-1">
        <Input
          className="text-sm"
          placeholder="Description"
          {...register(`lineItems.${idx}.description`)}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description}</p>
        )}
      </div>
      <div className="col-span-2 space-y-1">
        <Input
          className="text-sm text-right"
          type="number"
          placeholder="Qty"
          {...register(`lineItems.${idx}.quantity`, { valueAsNumber: true })}
        />
        {errors.quantity && (
          <p className="text-xs text-destructive">{errors.quantity}</p>
        )}
      </div>
      <div className="col-span-2 space-y-1">
        <Input
          className="text-sm text-right"
          type="number"
          placeholder="Rate"
          {...register(`lineItems.${idx}.rate`, { valueAsNumber: true })}
        />
        {errors.rate && (
          <p className="text-xs text-destructive">{errors.rate}</p>
        )}
      </div>
      <div className="col-span-2 text-sm font-medium text-right pr-1 pt-2">
        {formatCurrencyFull(amount)}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="col-span-1 h-8 w-8"
        onClick={handleRemove}
        disabled={disabled}
        aria-label="Remove line item"
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createInvoice = useCreateInvoice();

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateInvoiceDialogValues>({
    resolver: zodResolver(createInvoiceDialogSchema),
    defaultValues: DIALOG_DEFAULT_VALUES,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });
  const watchedItems = watch("lineItems");
  const watchedTaxRate = watch("taxRate");
  const watchedDiscount = watch("discount");

  const subtotal = (watchedItems ?? []).reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
    0,
  );
  const taxAmount = subtotal * ((Number(watchedTaxRate) || 0) / 100);
  const total = subtotal + taxAmount - (Number(watchedDiscount) || 0);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) reset(DIALOG_DEFAULT_VALUES);
    onOpenChange(isOpen);
  }

  function handleAddLineItem() {
    append({ description: "", quantity: 1, rate: 0 });
  }

  function handleCancel() {
    onOpenChange(false);
    reset(DIALOG_DEFAULT_VALUES);
  }

  function onSubmit(values: CreateInvoiceDialogValues) {
    const lineItemsPayload = values.lineItems.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      amount: Math.round(Number(item.quantity) * Number(item.rate) * 100) / 100,
    }));
    createInvoice.mutate(
      {
        lineItems: lineItemsPayload,
        taxRate: Number(values.taxRate),
        discount: Number(values.discount) || 0,
        dueDate: values.dueDate || undefined,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          reset(DIALOG_DEFAULT_VALUES);
          toast.success("Invoice created");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4 px-6 py-4">
          <div>
            <Label className="mb-2 block text-xs font-medium text-muted-foreground">
              Line Items
            </Label>
            <div className="space-y-2">
              {fields.map((field, idx) => {
                const lineAmount =
                  (Number(watchedItems?.[idx]?.quantity) || 0) *
                  (Number(watchedItems?.[idx]?.rate) || 0);
                return (
                  <DialogLineItemRow
                    key={field.id}
                    idx={idx}
                    amount={lineAmount}
                    register={register}
                    errors={{
                      description:
                        errors.lineItems?.[idx]?.description?.message,
                      quantity: errors.lineItems?.[idx]?.quantity?.message,
                      rate: errors.lineItems?.[idx]?.rate?.message,
                    }}
                    disabled={fields.length === 1}
                    onRemove={remove}
                  />
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLineItem}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
              </Button>
              {errors.lineItems &&
                typeof errors.lineItems.message === "string" && (
                  <p className="text-xs text-destructive">
                    {errors.lineItems.message}
                  </p>
                )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Tax Rate (%)</Label>
              <Input
                type="number"
                className="mt-1"
                {...register("taxRate", { valueAsNumber: true })}
              />
              {errors.taxRate && (
                <p className="text-xs text-destructive mt-0.5">
                  {errors.taxRate.message}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Discount</Label>
              <Input
                type="number"
                className="mt-1"
                {...register("discount", { valueAsNumber: true })}
              />
              {errors.discount && (
                <p className="text-xs text-destructive mt-0.5">
                  {errors.discount.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs">Due Date</Label>
            <Controller
              control={control}
              name="dueDate"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Select due date"
                />
              )}
            />
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Input
              placeholder="Payment terms, bank details, etc."
              className="mt-1"
              {...register("notes")}
            />
          </div>

          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrencyFull(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Tax ({Number(watchedTaxRate) || 0}%)
              </span>
              <span>{formatCurrencyFull(taxAmount)}</span>
            </div>
            {(Number(watchedDiscount) || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-destructive">
                  -{formatCurrencyFull(Number(watchedDiscount))}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 text-base font-bold">
              <span>Total</span>
              <span>{formatCurrencyFull(total)}</span>
            </div>
          </div>
          </DialogBody>

          <DialogFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1 h-4 w-4" />
              )}
              Create Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
