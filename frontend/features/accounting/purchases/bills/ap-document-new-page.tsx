"use client";

import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
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
  const canManage = useCan("accounting:payables:manage");
  const bookQuery = useAccountingBook();

  function handleSaved(document: ApDocumentDetail): void {
    router.push(`/accounting/purchase-bills/${document.id}`);
  }

  function handleCancel(): void {
    router.push(backHref);
  }

  if (!canManage) {
    return (
      <PageWrapper title={title} backHref={backHref} backLabel={backLabel}>
        <NoPermissionState permission="accounting:payables:manage" />
      </PageWrapper>
    );
  }

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
