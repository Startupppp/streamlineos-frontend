"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateInvoice } from "@/hooks/api/invoice";
import { getErrorMessage } from "@/lib/get-error-message";
import { INDIAN_STATES } from "@/lib/accounting/indian-states";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const GST_RATE_OPTIONS: ReadonlyArray<number> = [0, 5, 12, 18, 28];

const lineItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  hsnSacCode: z.string().optional(),
  quantity: z.number().positive("Qty must be > 0"),
  rate: z.number().nonnegative("Rate must be >= 0"),
  gstRate: z
    .number()
    .refine((v) => GST_RATE_OPTIONS.includes(v), "Invalid GST rate"),
});

const invoiceFormSchema = z
  .object({
    items: z.array(lineItemSchema).min(1, "Add at least one line item"),
    discount: z.number().min(0),
    currency: z.string().min(1),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
    placeOfSupply: z
      .string()
      .regex(/^\d{2}$/)
      .optional()
      .or(z.literal("")),
    customerGstin: z
      .string()
      .regex(GSTIN_REGEX, "Invalid GSTIN")
      .optional()
      .or(z.literal("")),
    supplierGstin: z
      .string()
      .regex(GSTIN_REGEX, "Invalid GSTIN")
      .optional()
      .or(z.literal("")),
    reverseCharge: z.boolean(),
  })
  .refine((v) => v.discount <= grossTotal(v.items), {
    message: "Discount cannot exceed the invoice subtotal plus tax",
    path: ["discount"],
  });

function grossTotal(
  items: { quantity: number; rate: number; gstRate: number }[],
): number {
  return items.reduce((acc, it) => {
    const qty = Number(it.quantity) || 0;
    const rate = Number(it.rate) || 0;
    const gstRate = Number(it.gstRate) || 0;
    const amount = qty * rate;
    return acc + amount + amount * (gstRate / 100);
  }, 0);
}

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

function fmt(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

function splitTaxPool(taxPool: number, supplierStateCode: string, placeOfSupplyStateCode: string) {
  if (supplierStateCode === placeOfSupplyStateCode) {
    const half = round2(taxPool / 2);
    return { cgst: half, sgst: round2(taxPool - half), igst: 0, total: taxPool };
  }
  return { cgst: 0, sgst: 0, igst: round2(taxPool), total: taxPool };
}

const DEFAULT_ITEM = {
  description: "",
  hsnSacCode: "",
  quantity: 1,
  rate: 0,
  gstRate: 0,
} as const;

export default function NewInvoicePage() {
  const router = useRouter();
  const createInvoice = useCreateInvoice();

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      items: [
        { description: "", hsnSacCode: "", quantity: 1, rate: 0, gstRate: 0 },
      ],
      discount: 0,
      currency: "INR",
      dueDate: "",
      notes: "",
      placeOfSupply: "",
      customerGstin: "",
      supplierGstin: "",
      reverseCharge: false,
    },
  });

  const { control, register, handleSubmit, setValue, formState } = form;
  const { errors } = formState;

  const itemsArray = useFieldArray({ control, name: "items" });

  const watchedItems = useWatch({ control, name: "items" });
  const watchedDiscount = useWatch({ control, name: "discount" });
  const watchedPlaceOfSupply = useWatch({ control, name: "placeOfSupply" });
  const watchedSupplierGstin = useWatch({ control, name: "supplierGstin" });

  const totals = useMemo(() => {
    const items = watchedItems ?? [];
    const { lines, subtotal, taxPool } = items.reduce<{
      lines: { amount: number; tax: number }[];
      subtotal: number;
      taxPool: number;
    }>(
      (acc, it) => {
        const qty = Number(it?.quantity) || 0;
        const rate = Number(it?.rate) || 0;
        const gstRate = Number(it?.gstRate) || 0;
        const amount = round2(qty * rate);
        const tax = round2(amount * (gstRate / 100));
        return {
          lines: [...acc.lines, { amount, tax }],
          subtotal: round2(acc.subtotal + amount),
          taxPool: round2(acc.taxPool + tax),
        };
      },
      { lines: [], subtotal: 0, taxPool: 0 },
    );

    const placeOfSupplyStateCode = watchedPlaceOfSupply ?? "";
    const supplierStateCode =
      watchedSupplierGstin && watchedSupplierGstin.length >= 2
        ? watchedSupplierGstin.slice(0, 2)
        : placeOfSupplyStateCode;

    const split = splitTaxPool(taxPool, supplierStateCode, placeOfSupplyStateCode);

    const discount = Number(watchedDiscount) || 0;
    const total = round2(subtotal + taxPool - discount);

    return { lines, subtotal, taxPool, split, total, discount };
  }, [
    watchedItems,
    watchedDiscount,
    watchedPlaceOfSupply,
    watchedSupplierGstin,
  ]);

  const handleAddLine = useCallback(() => {
    itemsArray.append({ ...DEFAULT_ITEM });
  }, [itemsArray]);

  const handleRemoveLine = useCallback(
    (index: number) => {
      if (itemsArray.fields.length <= 1) return;
      itemsArray.remove(index);
    },
    [itemsArray],
  );

  const handleGstRateChange = useCallback(
    (index: number, value: string) => {
      setValue(`items.${index}.gstRate`, Number(value), {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [setValue],
  );

  const handlePlaceOfSupplyChange = useCallback(
    (value: string) => {
      setValue("placeOfSupply", value, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [setValue],
  );

  const handleDueDateChange = useCallback(
    (value: string) => {
      setValue("dueDate", value, { shouldDirty: true });
    },
    [setValue],
  );

  const handleReverseChargeChange = useCallback(
    (checked: boolean | "indeterminate") => {
      setValue("reverseCharge", checked === true, { shouldDirty: true });
    },
    [setValue],
  );

  const onSubmit = useCallback(
    (values: InvoiceFormValues) => {
      const itemsPayload = values.items.map((item) => ({
        description: item.description,
        hsnSacCode:
          item.hsnSacCode && item.hsnSacCode.length > 0
            ? item.hsnSacCode
            : undefined,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        gstRate: Number(item.gstRate),
      }));

      const legacyLineItems = values.items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        amount: round2(Number(item.quantity) * Number(item.rate)),
      }));

      const placeOfSupply =
        values.placeOfSupply && values.placeOfSupply.length > 0
          ? values.placeOfSupply
          : undefined;
      const customerGstin =
        values.customerGstin && values.customerGstin.length > 0
          ? values.customerGstin
          : undefined;
      const supplierGstin =
        values.supplierGstin && values.supplierGstin.length > 0
          ? values.supplierGstin
          : undefined;
      const dueDate =
        values.dueDate && values.dueDate.length > 0
          ? values.dueDate
          : undefined;
      const notes =
        values.notes && values.notes.length > 0 ? values.notes : undefined;

      createInvoice.mutate(
        {
          items: itemsPayload,
          lineItems: legacyLineItems,
          discount: Number(values.discount) || 0,
          currency: values.currency,
          dueDate,
          notes,
          placeOfSupply,
          customerGstin,
          supplierGstin,
          reverseCharge: values.reverseCharge,
        },
        {
          onSuccess: (inv) => {
            toast.success("Invoice created");
            router.push(`/billing/invoices/${inv.id}`);
          },
          onError: (apiError) => toast.error(getErrorMessage(apiError)),
        },
      );
    },
    [createInvoice, router],
  );

  const onInvalid = useCallback(() => {
    toast.error("Please fix the form errors before submitting");
  }, []);

  const intraState = totals.split.igst === 0 && totals.taxPool > 0;
  const interState = totals.split.igst > 0;

  return (
    <PageWrapper
      title="New Invoice"
      subtitle="Create a new invoice for a client"
      actions={
        <Link href="/billing/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
          </Button>
        </Link>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="space-y-6"
      >
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Line Items</p>
          </div>
          <div className="p-4 space-y-2">
            <div className="hidden md:grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
              <span className="col-span-3">Description</span>
              <span className="col-span-2">HSN/SAC</span>
              <span className="col-span-1 text-right">Qty</span>
              <span className="col-span-2 text-right">Rate</span>
              <span className="col-span-2">GST %</span>
              <span className="col-span-1 text-right">Amount</span>
            </div>
            {itemsArray.fields.map((field, idx) => {
              const lineAmount = totals.lines[idx]?.amount ?? 0;
              return (
                <div
                  key={field.id}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 md:grid-cols-12 md:gap-2 md:items-center md:rounded-none md:border-0 md:p-0"
                >
                  <div className="space-y-1 md:col-span-3 md:space-y-0">
                    <Label className="text-xs text-muted-foreground md:hidden">
                      Description
                    </Label>
                    <Input
                      className="text-sm"
                      placeholder="Description"
                      aria-label={`Description for item ${idx + 1}`}
                      {...register(`items.${idx}.description`)}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2 md:space-y-0">
                    <Label className="text-xs text-muted-foreground md:hidden">
                      HSN/SAC
                    </Label>
                    <Input
                      className="text-sm"
                      placeholder="HSN/SAC"
                      aria-label={`HSN or SAC for item ${idx + 1}`}
                      {...register(`items.${idx}.hsnSacCode`)}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-1 md:space-y-0">
                    <Label className="text-xs text-muted-foreground md:hidden">
                      Qty
                    </Label>
                    <Input
                      className="text-sm md:text-right"
                      type="number"
                      min={1}
                      placeholder="1"
                      aria-label={`Quantity for item ${idx + 1}`}
                      {...register(`items.${idx}.quantity`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2 md:space-y-0">
                    <Label className="text-xs text-muted-foreground md:hidden">
                      Rate
                    </Label>
                    <Input
                      className="text-sm md:text-right"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0"
                      aria-label={`Rate for item ${idx + 1}`}
                      {...register(`items.${idx}.rate`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2 md:space-y-0">
                    <Label className="text-xs text-muted-foreground md:hidden">
                      GST %
                    </Label>
                    <Controller
                      control={control}
                      name={`items.${idx}.gstRate`}
                      render={({ field: gstField }) => (
                        <Select
                          value={String(gstField.value ?? 0)}
                          onValueChange={(value) =>
                            handleGstRateChange(idx, value)
                          }
                        >
                          <SelectTrigger
                            className="text-sm"
                            aria-label={`GST rate for item ${idx + 1}`}
                          >
                            <SelectValue placeholder="0%" />
                          </SelectTrigger>
                          <SelectContent>
                            {GST_RATE_OPTIONS.map((rate) => (
                              <SelectItem key={rate} value={String(rate)}>
                                {rate}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between md:col-span-1 md:block md:text-right md:pr-1">
                    <span className="text-xs text-muted-foreground md:hidden">
                      Amount
                    </span>
                    <span className="text-sm font-medium">
                      {fmt(lineAmount)}
                    </span>
                  </div>
                  <div className="flex justify-end md:col-span-12 md:-mt-1">
                    <LineItemRemoveButton
                      idx={idx}
                      disabled={itemsArray.fields.length === 1}
                      onRemove={handleRemoveLine}
                    />
                  </div>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleAddLine}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
            </Button>
            {errors.items && typeof errors.items.message === "string" && (
              <p className="text-xs text-destructive">{errors.items.message}</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <p className="text-sm font-semibold">GST</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="place-of-supply" className="text-xs">
                Place of Supply
              </Label>
              <Controller
                control={control}
                name="placeOfSupply"
                render={({ field: posField }) => (
                  <Select
                    value={posField.value ?? ""}
                    onValueChange={handlePlaceOfSupplyChange}
                  >
                    <SelectTrigger id="place-of-supply" className="text-sm">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s.stateCode} value={s.stateCode}>
                          {s.stateName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.placeOfSupply?.message && (
                <p className="text-xs text-destructive">
                  {errors.placeOfSupply.message}
                </p>
              )}
            </div>
            <div className="space-y-1 flex items-end pb-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Controller
                  control={control}
                  name="reverseCharge"
                  render={({ field: rcField }) => (
                    <Checkbox
                      checked={rcField.value === true}
                      onCheckedChange={handleReverseChargeChange}
                      aria-label="Reverse charge"
                    />
                  )}
                />
                <span>Reverse Charge</span>
              </label>
            </div>
            <div className="space-y-1">
              <Label htmlFor="customer-gstin" className="text-xs">
                Customer GSTIN
              </Label>
              <Input
                id="customer-gstin"
                className="text-sm"
                placeholder="22AAAAA0000A1Z5"
                {...register("customerGstin")}
              />
              {errors.customerGstin?.message && (
                <p className="text-xs text-destructive">
                  {errors.customerGstin.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="supplier-gstin" className="text-xs">
                Supplier GSTIN
              </Label>
              <Input
                id="supplier-gstin"
                className="text-sm"
                placeholder="22AAAAA0000A1Z5"
                {...register("supplierGstin")}
              />
              {errors.supplierGstin?.message && (
                <p className="text-xs text-destructive">
                  {errors.supplierGstin.message}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Supplier state is inferred from supplier GSTIN; when blank,
            intra-state is assumed and the server resolves authoritatively.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{fmt(totals.subtotal)}</span>
          </div>
          {intraState && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>CGST</span>
                <span>{fmt(totals.split.cgst)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>SGST</span>
                <span>{fmt(totals.split.sgst)}</span>
              </div>
            </>
          )}
          {interState && (
            <div className="flex justify-between text-muted-foreground">
              <span>IGST</span>
              <span>{fmt(totals.split.igst)}</span>
            </div>
          )}
          {totals.discount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span className="text-destructive">-{fmt(totals.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1.5 border-t border-border">
            <span>Total</span>
            <span>{fmt(totals.total)}</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <p className="text-sm font-semibold">Invoice Settings</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="discount" className="text-xs">
                Discount (₹)
              </Label>
              <Input
                id="discount"
                type="number"
                min={0}
                step="0.01"
                className="text-sm"
                {...register("discount", { valueAsNumber: true })}
              />
              {errors.discount?.message && (
                <p className="text-xs text-destructive">
                  {errors.discount.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="due-date" className="text-xs">
                Due Date
              </Label>
              <Controller
                control={control}
                name="dueDate"
                render={({ field: dueField }) => (
                  <DatePicker
                    id="due-date"
                    value={dueField.value ?? ""}
                    onChange={handleDueDateChange}
                    placeholder="Select due date"
                  />
                )}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="currency" className="text-xs">
                Currency
              </Label>
              <Input
                id="currency"
                className="text-sm"
                placeholder="INR"
                {...register("currency")}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">
              Notes / Payment Terms
            </Label>
            <Input
              id="notes"
              placeholder="e.g. Payment due within 30 days. Bank: HDFC, A/C: 1234567890"
              className="text-sm"
              {...register("notes")}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/billing/invoices">
            <Button type="button" variant="outline" size="sm">
              Cancel
            </Button>
          </Link>
          <LoadingButton
            type="submit"
            size="sm"
            isPending={createInvoice.isPending}
            loadingText="Creating…"
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            Create Invoice
          </LoadingButton>
        </div>
      </form>
    </PageWrapper>
  );
}

interface LineItemRemoveButtonProps {
  idx: number;
  disabled: boolean;
  onRemove: (idx: number) => void;
}

function LineItemRemoveButton({
  idx,
  disabled,
  onRemove,
}: LineItemRemoveButtonProps) {
  function handleClick() {
    onRemove(idx);
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="w-7 text-muted-foreground hover:text-destructive"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Remove item ${idx + 1}`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
