"use client";

import { Controller, type Control, type FieldErrors, type UseFormRegister, type UseFormRegisterReturn, type UseFormSetValue } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDIAN_STATES } from "@/lib/accounting/indian-states";
import type { InvoiceFormValues } from "./new-invoice-schema";

interface InvoiceTaxDetailsProps {
  control: Control<InvoiceFormValues>;
  errors: FieldErrors<InvoiceFormValues>;
  register: UseFormRegister<InvoiceFormValues>;
  setValue: UseFormSetValue<InvoiceFormValues>;
}

export function InvoiceTaxDetails({ control, errors, register, setValue }: InvoiceTaxDetailsProps) {
  function handlePlaceOfSupplyChange(value: string) { setValue("placeOfSupply", value, { shouldValidate: true, shouldDirty: true }); }
  function handleReverseChargeChange(checked: boolean | "indeterminate") { setValue("reverseCharge", checked === true, { shouldDirty: true }); }
  function handleDueDateChange(value: string) { setValue("dueDate", value, { shouldDirty: true }); }

  return <>
    <section className="space-y-4 rounded-lg border border-border bg-card p-4" aria-labelledby="invoice-gst-heading">
      <p id="invoice-gst-heading" className="text-sm font-semibold">GST</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="place-of-supply" className="text-xs">Place of Supply</Label><Controller control={control} name="placeOfSupply" render={({ field }) => <Select value={field.value ?? ""} onValueChange={handlePlaceOfSupplyChange}><SelectTrigger id="place-of-supply" className="text-sm"><SelectValue placeholder="Select state" /></SelectTrigger><SelectContent>{INDIAN_STATES.map((state) => <SelectItem key={state.stateCode} value={state.stateCode}>{state.stateName}</SelectItem>)}</SelectContent></Select>} />{errors.placeOfSupply?.message ? <p className="text-xs text-destructive">{errors.placeOfSupply.message}</p> : null}</div>
        <div className="flex items-end pb-1"><label className="flex cursor-pointer items-center gap-2 text-xs"><Controller control={control} name="reverseCharge" render={({ field }) => <Checkbox checked={field.value === true} onCheckedChange={handleReverseChargeChange} aria-label="Reverse charge" />} /><span>Reverse Charge</span></label></div>
        <GstinField id="customer-gstin" label="Customer GSTIN" error={errors.customerGstin?.message} registration={register("customerGstin")} />
        <GstinField id="supplier-gstin" label="Supplier GSTIN" error={errors.supplierGstin?.message} registration={register("supplierGstin")} />
      </div>
      <p className="text-xs text-muted-foreground">Supplier state is inferred from supplier GSTIN; when blank, intra-state is assumed and the server resolves authoritatively.</p>
    </section>
    <section className="space-y-4 rounded-lg border border-border bg-card p-4" aria-labelledby="invoice-settings-heading">
      <p id="invoice-settings-heading" className="text-sm font-semibold">Invoice Settings</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="discount" className="text-xs">Discount (₹)</Label><Input id="discount" type="number" min={0} step="0.01" className="text-sm" {...register("discount", { valueAsNumber: true })} />{errors.discount?.message ? <p className="text-xs text-destructive">{errors.discount.message}</p> : null}</div>
        <div className="space-y-1"><Label htmlFor="due-date" className="text-xs">Due Date</Label><Controller control={control} name="dueDate" render={({ field }) => <DatePicker id="due-date" value={field.value ?? ""} onChange={handleDueDateChange} placeholder="Select due date" />} /></div>
        <div className="space-y-1"><Label htmlFor="currency" className="text-xs">Currency</Label><Input id="currency" className="text-sm" placeholder="INR" {...register("currency")} /></div>
      </div>
      <div className="space-y-1"><Label htmlFor="notes" className="text-xs">Notes / Payment Terms</Label><Input id="notes" placeholder="e.g. Payment due within 30 days. Bank: HDFC, A/C: 1234567890" className="text-sm" {...register("notes")} /></div>
    </section>
  </>;
}

function GstinField({ id, label, error, registration }: { id: string; label: string; error?: string; registration: UseFormRegisterReturn }) {
  return <div className="space-y-1"><Label htmlFor={id} className="text-xs">{label}</Label><Input id={id} className="text-sm" placeholder="22AAAAA0000A1Z5" {...registration} />{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>;
}
