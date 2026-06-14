"use client";

import { use } from "react";
import { InvoiceDetail } from "@/features/billing/invoice-detail";

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
  return <InvoiceDetail invoiceId={Number(invoiceId)} />;
}
