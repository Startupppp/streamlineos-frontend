"use client";

import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useAccountingBook } from "@/hooks/api/accounting/ledger";
import type { ApDocumentDetail, ApDocumentType } from "@/types/accounting-ap";
import { BillEditorForm } from "./bill-editor-form";

interface ApDocumentNewPageProps {
  documentType: ApDocumentType;
  title: string;
  subtitle: string;
  backHref: string;
  backLabel: string;
}

export function ApDocumentNewPage({
  documentType,
  title,
  subtitle,
  backHref,
  backLabel,
}: ApDocumentNewPageProps) {
  const router = useRouter();
  const bookQuery = useAccountingBook();

  const pageState = usePageState({
    permission: "accounting:payables:manage",
    isLoading: false,
    isError: false,
  });

  function handleSaved(document: ApDocumentDetail): void {
    router.push(`/accounting/purchase-bills/${document.id}`);
  }

  function handleCancel(): void {
    router.push(backHref);
  }

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title={title} backHref={backHref} backLabel={backLabel}>
        <PageState resolution={pageState} loading={null} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  return (
    <PageWrapper title={title} subtitle={subtitle} backHref={backHref} backLabel={backLabel}>
      <div className="mx-auto w-full max-w-3xl">
        <BillEditorForm
          documentType={documentType}
          document={null}
          defaultCurrency={bookQuery.data?.baseCurrency ?? "INR"}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      </div>
    </PageWrapper>
  );
}
