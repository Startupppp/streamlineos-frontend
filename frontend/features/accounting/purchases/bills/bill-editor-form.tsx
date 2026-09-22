"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { moneyInputValue } from "@/lib/accounting/money";
import {
  useCreateApDocument,
  useUpdateApDocument,
} from "@/hooks/api/accounting/ap";
import type {
  ApDocumentDetail,
  ApDocumentType,
  VendorSummary,
} from "@/types/accounting/accounting-ap";
import { describeBillWriteError } from "../lib/ap-errors";
import { todayIso } from "../lib/ap-dates";
import { BillDocumentFlags } from "./bill-document-flags";
import { BillHeaderFields } from "./bill-header-fields";
import { BillLineEditor } from "./bill-line-editor";
import { buildBillPayload } from "./bill-payload";
import {
  billFormSchema,
  EMPTY_BILL_LINE,
  type BillFormValues,
} from "./bill-form-schema";

interface BillEditorFormProps {
  documentType: ApDocumentType;
  document: ApDocumentDetail | null;
  defaultCurrency: string;
  onSaved: (document: ApDocumentDetail) => void;
  onCancel: () => void;
}

function toFormValues(
  document: ApDocumentDetail | null,
  defaultCurrency: string,
): BillFormValues {
  if (!document) {
    return {
      partyId: "",
      vendorDocumentNumber: "",
      vendorDocumentDate: todayIso(),
      issueDate: todayIso(),
      dueDate: "",
      currency: defaultCurrency,
      reverseCharge: false,
      blockedInputTax: false,
      taxInclusive: false,
      placeOfSupplyCode: "",
      reference: "",
      memo: "",
      lines: [{ ...EMPTY_BILL_LINE }],
    };
  }

  return {
    partyId: document.partyId,
    vendorDocumentNumber: document.vendorDocumentNumber ?? "",
    vendorDocumentDate: document.vendorDocumentDate ?? document.issueDate,
    issueDate: document.issueDate,
    dueDate: document.dueDate ?? "",
    currency: document.currency,
    reverseCharge: document.reverseCharge,
    blockedInputTax: document.blockedInputTax,
    taxInclusive: document.taxInclusive,
    placeOfSupplyCode: document.placeOfSupplyCode ?? "",
    reference: document.reference ?? "",
    memo: document.memo ?? "",
    lines: document.lines.map((line) => ({
      description: line.description,
      quantity: (line.quantityMilli / 1000).toString(),
      unitPrice: moneyInputValue(line.unitPriceMinor, document.currency),
      discount: moneyInputValue(line.discountMinor, document.currency),
      taxCategory: line.taxCategory,
      commodityCode: line.commodityCode ?? "",
      expenseAccountId: line.expenseAccountId ?? "",
      capitalize: line.capitalize,
    })),
  };
}

export function BillEditorForm({
  documentType,
  document,
  defaultCurrency,
  onSaved,
  onCancel,
}: BillEditorFormProps) {
  const createDocument = useCreateApDocument();
  const updateDocument = useUpdateApDocument();
  const [vendorName, setVendorName] = useState(
    document?.partyName ?? "This vendor",
  );

  const defaultValues = useMemo(
    () => toFormValues(document, defaultCurrency),
    [document, defaultCurrency],
  );

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues,
  });

  const currency = form.watch("currency") || defaultCurrency;

  function handleVendorSelected(vendor: VendorSummary): void {
    setVendorName(vendor.displayName);
  }

  function handleSubmit(values: BillFormValues): void {
    const built = buildBillPayload(values);
    if (!built.ok) {
      form.setError(`lines.${built.lineIndex}.${built.field}`, {
        message: built.message,
      });
      return;
    }

    const onError = (error: unknown) => {
      toast.error(
        describeBillWriteError(
          error,
          vendorName,
          values.vendorDocumentNumber.trim(),
        ),
      );
    };

    if (document) {
      updateDocument.mutate(
        { apDocumentId: document.id, input: built.payload },
        {
          onSuccess: (saved) => {
            toast.success("Draft saved");
            onSaved(saved);
          },
          onError,
        },
      );
      return;
    }

    createDocument.mutate(
      { ...built.payload, documentType },
      {
        onSuccess: (saved) => {
          toast.success(
            documentType === "DEBIT_NOTE"
              ? "Vendor credit entered as a draft"
              : "Bill entered as a draft",
          );
          onSaved(saved);
        },
        onError,
      },
    );
  }

  const isSubmitting = createDocument.isPending || updateDocument.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm font-semibold">
              Who billed you
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            <BillHeaderFields
              form={form}
              lockVendor={!!document}
              onVendorSelected={handleVendorSelected}
            />
          </CardContent>
        </Card>

        <BillLineEditor form={form} currency={currency} />

        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm font-semibold">
              How the tax works on this bill
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <BillDocumentFlags form={form} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <LoadingButton type="submit" isPending={isSubmitting}>
            {document ? "Save changes" : "Save as draft"}
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
