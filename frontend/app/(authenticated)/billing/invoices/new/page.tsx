"use client";

import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NewInvoiceForm } from "@/features/billing/new-invoice/new-invoice-form";

export default function NewInvoicePage() {
  const router = useRouter();

  function handleCreated(invoiceId: number) {
    router.push(`/billing/invoices/${invoiceId}`);
  }

  return <PageWrapper title="New Invoice" subtitle="Create a new invoice for a client" backHref="/billing/invoices"><NewInvoiceForm onCreated={handleCreated} /></PageWrapper>;
}
