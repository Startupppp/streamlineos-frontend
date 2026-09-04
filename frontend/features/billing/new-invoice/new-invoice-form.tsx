"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCreateInvoice } from "@/hooks/api/invoice";
import { useCan } from "@/hooks/api/access";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { DEFAULT_INVOICE_VALUES, invoiceFormSchema, roundInvoiceAmount, type InvoiceFormValues } from "./new-invoice-schema";
import { InvoiceLineItems } from "./invoice-line-items";
import { InvoiceTaxDetails } from "./invoice-tax-details";
import { InvoiceTotals, type InvoiceTotalsValue } from "./invoice-totals";

interface NewInvoiceFormProps { onCreated: (invoiceId: number) => void; }

export function NewInvoiceForm({ onCreated }: NewInvoiceFormProps) {
  // POST /invoices declares accounting:create.
  const canCreate = useCan("accounting:create");
  const createInvoice = useCreateInvoice();
  const form = useForm<InvoiceFormValues>({ resolver: zodResolver(invoiceFormSchema), defaultValues: DEFAULT_INVOICE_VALUES });
  const { control, register, handleSubmit, setValue, formState } = form;
  const items = useWatch({ control, name: "items" });
  const discount = useWatch({ control, name: "discount" });
  const placeOfSupply = useWatch({ control, name: "placeOfSupply" });
  const supplierGstin = useWatch({ control, name: "supplierGstin" });
  const lineItems = useFieldArray({ control, name: "items" });
  const totals = useMemo(() => calculateTotals(items ?? [], Number(discount) || 0, placeOfSupply ?? "", supplierGstin ?? ""), [discount, items, placeOfSupply, supplierGstin]);

  function handleValidSubmit(values: InvoiceFormValues) {
    createInvoice.mutate(toCreateInvoicePayload(values), {
      onSuccess: (invoice) => { toast.success("Invoice created"); onCreated(invoice.id); },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleInvalidSubmit() { toast.error("Please fix the form errors before submitting"); }

  if (!canCreate)
    return <NoPermissionState permission="accounting:create" title="Cannot create invoices" description="You do not have permission to raise an invoice for this organization." />;

  return <form onSubmit={handleSubmit(handleValidSubmit, handleInvalidSubmit)} className="space-y-6">
    <InvoiceLineItems control={control} errors={formState.errors} fields={lineItems.fields} register={register} remove={lineItems.remove} append={lineItems.append} setValue={setValue} amounts={totals.amounts} />
    <InvoiceTaxDetails control={control} errors={formState.errors} register={register} setValue={setValue} />
    <InvoiceTotals totals={totals} />
    <div className="flex justify-end gap-2"><Link href="/billing/invoices"><Button type="button" variant="outline" size="sm">Cancel</Button></Link><LoadingButton type="submit" size="sm" isPending={createInvoice.isPending} loadingText="Creating…"><FileText className="mr-1 h-3.5 w-3.5" />Create Invoice</LoadingButton></div>
  </form>;
}

function calculateTotals(items: InvoiceFormValues["items"], discount: number, placeOfSupply: string, supplierGstin: string): InvoiceTotalsValue & { amounts: number[] } {
  const itemTotals = items.map((item) => {
    const amount = roundInvoiceAmount((Number(item.quantity) || 0) * (Number(item.rate) || 0));
    return { amount, tax: roundInvoiceAmount(amount * ((Number(item.gstRate) || 0) / 100)) };
  });
  const subtotal = roundInvoiceAmount(itemTotals.reduce((total, item) => total + item.amount, 0));
  const taxPool = roundInvoiceAmount(itemTotals.reduce((total, item) => total + item.tax, 0));
  const supplierState = supplierGstin.length >= 2 ? supplierGstin.slice(0, 2) : placeOfSupply;
  const split = splitTaxPool(taxPool, supplierState, placeOfSupply);
  return { amounts: itemTotals.map((item) => item.amount), subtotal, taxPool, discount, split, total: roundInvoiceAmount(subtotal + taxPool - discount) };
}

function splitTaxPool(taxPool: number, supplierState: string, placeOfSupply: string) {
  if (supplierState === placeOfSupply) {
    const cgst = roundInvoiceAmount(taxPool / 2);
    return { cgst, sgst: roundInvoiceAmount(taxPool - cgst), igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: roundInvoiceAmount(taxPool) };
}

function toOptional(value: string | undefined): string | undefined { return value && value.length > 0 ? value : undefined; }

function toCreateInvoicePayload(values: InvoiceFormValues) {
  return {
    items: values.items.map((item) => ({ description: item.description, hsnSacCode: toOptional(item.hsnSacCode), quantity: Number(item.quantity), rate: Number(item.rate), gstRate: Number(item.gstRate) })),
    lineItems: values.items.map((item) => ({ description: item.description, quantity: Number(item.quantity), rate: Number(item.rate), amount: roundInvoiceAmount(Number(item.quantity) * Number(item.rate)) })),
    discount: Number(values.discount) || 0,
    currency: values.currency,
    dueDate: toOptional(values.dueDate),
    notes: toOptional(values.notes),
    placeOfSupply: toOptional(values.placeOfSupply),
    customerGstin: toOptional(values.customerGstin),
    supplierGstin: toOptional(values.supplierGstin),
    reverseCharge: values.reverseCharge,
  };
}
