"use client";

import { use } from "react";
import { InvoiceDetailContent } from "@/features/accounting/sales/invoice-detail-view";

export default function AccountingInvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
  return <InvoiceDetailContent invoiceId={Number(invoiceId)} />;
}