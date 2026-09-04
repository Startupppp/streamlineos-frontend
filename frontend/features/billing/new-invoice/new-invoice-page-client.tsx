"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NewInvoiceForm } from "@/features/billing/new-invoice/new-invoice-form";

export function NewInvoicePageClient() {
  const router = useRouter();

  const handleCreated = useCallback(
    (invoiceId: number) => {
      router.push(`/billing/invoices/${invoiceId}`);
    },
    [router],
  );

  return (
    <PageWrapper
      title="New Invoice"
      subtitle="Create a new invoice for a client"
      backHref="/billing/invoices"
    >
      <NewInvoiceForm onCreated={handleCreated} />
    </PageWrapper>
  );
}
