"use client";

import type { ReactNode } from "react";
import { Controller, type Control, type FieldErrors, type UseFieldArrayReturn, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_LINE_ITEM, formatInvoiceAmount, GST_RATE_OPTIONS, type InvoiceFormValues } from "./new-invoice-schema";

interface InvoiceLineItemsProps {
  control: Control<InvoiceFormValues>;
  errors: FieldErrors<InvoiceFormValues>;
  fields: UseFieldArrayReturn<InvoiceFormValues, "items", "id">["fields"];
  register: UseFormRegister<InvoiceFormValues>;
  remove: UseFieldArrayReturn<InvoiceFormValues, "items", "id">["remove"];
  append: UseFieldArrayReturn<InvoiceFormValues, "items", "id">["append"];
  setValue: UseFormSetValue<InvoiceFormValues>;
  amounts: readonly number[];
}

export function InvoiceLineItems({ control, errors, fields, register, remove, append, setValue, amounts }: InvoiceLineItemsProps) {
  function handleAddItem() {
    append({ ...DEFAULT_LINE_ITEM });
  }

  function handleRemoveItem(index: number) {
    if (fields.length > 1) remove(index);
  }

  function handleGstRateChange(index: number, value: string) {
    setValue(`items.${index}.gstRate`, Number(value), { shouldValidate: true, shouldDirty: true });
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card" aria-labelledby="invoice-line-items-heading">
      <div className="border-b border-border px-4 py-3"><p id="invoice-line-items-heading" className="text-sm font-semibold">Line Items</p></div>
      <div className="space-y-2 p-4">
        <div className="hidden grid-cols-12 gap-2 px-1 text-xs text-muted-foreground md:grid"><span className="col-span-3">Description</span><span className="col-span-2">HSN/SAC</span><span className="col-span-1 text-right">Qty</span><span className="col-span-2 text-right">Rate</span><span className="col-span-2">GST %</span><span className="col-span-1 text-right">Amount</span></div>
        {fields.map((field, index) => <InvoiceLineItem key={field.id} control={control} register={register} index={index} amount={amounts[index] ?? 0} disabled={fields.length === 1} onRemove={handleRemoveItem} onGstRateChange={handleGstRateChange} />)}
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={handleAddItem}><Plus className="mr-1 h-3.5 w-3.5" /> Add Item</Button>
        {typeof errors.items?.message === "string" ? <p className="text-xs text-destructive">{errors.items.message}</p> : null}
      </div>
    </section>
  );
}

interface InvoiceLineItemProps {
  control: Control<InvoiceFormValues>;
  register: UseFormRegister<InvoiceFormValues>;
  index: number;
  amount: number;
  disabled: boolean;
  onRemove: (index: number) => void;
  onGstRateChange: (index: number, value: string) => void;
}

function InvoiceLineItem({ control, register, index, amount, disabled, onRemove, onGstRateChange }: InvoiceLineItemProps) {
  function handleRemove() { onRemove(index); }
  function handleGstRateChange(value: string) { onGstRateChange(index, value); }
  return <div className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 md:grid-cols-12 md:items-center md:gap-2 md:rounded-none md:border-0 md:p-0">
    <LineField label="Description"><Input className="text-sm" placeholder="Description" aria-label={`Description for item ${index + 1}`} {...register(`items.${index}.description`)} /></LineField>
    <LineField label="HSN/SAC" span="md:col-span-2"><Input className="text-sm" placeholder="HSN/SAC" aria-label={`HSN or SAC for item ${index + 1}`} {...register(`items.${index}.hsnSacCode`)} /></LineField>
    <LineField label="Qty" span="md:col-span-1"><Input className="text-sm md:text-right" type="number" min={1} placeholder="1" aria-label={`Quantity for item ${index + 1}`} {...register(`items.${index}.quantity`, { valueAsNumber: true })} /></LineField>
    <LineField label="Rate" span="md:col-span-2"><Input className="text-sm md:text-right" type="number" min={0} step="0.01" placeholder="0" aria-label={`Rate for item ${index + 1}`} {...register(`items.${index}.rate`, { valueAsNumber: true })} /></LineField>
    <LineField label="GST %" span="md:col-span-2"><Controller control={control} name={`items.${index}.gstRate`} render={({ field }) => <Select value={String(field.value ?? 0)} onValueChange={handleGstRateChange}><SelectTrigger className="text-sm" aria-label={`GST rate for item ${index + 1}`}><SelectValue placeholder="0%" /></SelectTrigger><SelectContent>{GST_RATE_OPTIONS.map((rate) => <SelectItem key={rate} value={String(rate)}>{rate}%</SelectItem>)}</SelectContent></Select>} /></LineField>
    <div className="flex items-center justify-between md:col-span-1 md:block md:pr-1 md:text-right"><span className="text-xs text-muted-foreground md:hidden">Amount</span><span className="text-sm font-medium">{formatInvoiceAmount(amount)}</span></div>
    <div className="flex justify-end md:col-span-12 md:-mt-1"><Button type="button" variant="ghost" size="icon" className="w-7 text-muted-foreground hover:text-destructive" onClick={handleRemove} disabled={disabled} aria-label={`Remove item ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></Button></div>
  </div>;
}

function LineField({ label, span = "md:col-span-3", children }: { label: string; span?: string; children: ReactNode }) {
  return <div className={`space-y-1 md:space-y-0 ${span}`}><Label className="text-xs text-muted-foreground md:hidden">{label}</Label>{children}</div>;
}
