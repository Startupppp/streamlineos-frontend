"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useAccountingBook } from "@/hooks/api/accounting/ledger";
import {
  useApDocument,
  useDeleteApDocument,
  usePostApDocument,
} from "@/hooks/api/accounting/ap";
import { ApplyVendorCreditAction } from "../vendor-credits/apply-vendor-credit-action";
import { AP_DOCUMENT_TYPE_LABELS } from "../lib/ap-labels";
import { BillEditorForm } from "./bill-editor-form";
import { BillLinesTable } from "./bill-lines-table";
import { BillSummaryCard } from "./bill-summary-card";
import { BillTaxPreviewCard } from "./bill-tax-preview-card";

interface BillDetailPageProps {
  apDocumentId: string;
}

export function BillDetailPage({ apDocumentId }: BillDetailPageProps) {
  const router = useRouter();
  const canManage = useCan("accounting:payables:manage");

  const [isEditing, setIsEditing] = useState(false);
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const bookQuery = useAccountingBook();
  const documentQuery = useApDocument(apDocumentId);
  const postDocument = usePostApDocument();
  const deleteDocument = useDeleteApDocument();

  const pageState = usePageState({
    permission: "accounting:payables:read",
    isLoading: documentQuery.isLoading,
    isError: documentQuery.isError,
    error: documentQuery.error,
  });
  const handleRetry = useCallback(() => { void documentQuery.refetch(); }, [documentQuery]);

  const lineDescriptions = useMemo(() => {
    const map: Record<string, string> = {};
    for (const line of documentQuery.data?.lines ?? []) map[line.id] = line.description;
    return map;
  }, [documentQuery.data]);

  function handlePost(): void {
    postDocument.mutate(apDocumentId, {
      onSuccess: (result) => {
        toast.success(
          result.replayed ? "This bill was already in the books" : "Bill posted to the books",
        );
        setIsPostOpen(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleDelete(): void {
    deleteDocument.mutate(apDocumentId, {
      onSuccess: () => {
        toast.success("Draft discarded");
        router.push("/accounting/purchase-bills");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Bill" backHref="/accounting/purchase-bills" backLabel="Back to bills">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  if (documentQuery.isPending || !documentQuery.data) {
    return (
      <PageWrapper title="Bill" backHref="/accounting/purchase-bills" backLabel="Back to bills">
        <div className="grid flex-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 w-full lg:col-span-2" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageWrapper>
    );
  }

  const document = documentQuery.data;
  const isDraft = document.status === "DRAFT";
  const canApplyCredit =
    document.documentType === "DEBIT_NOTE" &&
    (document.status === "POSTED" || document.status === "PARTIALLY_PAID") &&
    document.openMinor > 0;
  const backHref =
    document.documentType === "DEBIT_NOTE"
      ? "/accounting/vendor-credits"
      : "/accounting/purchase-bills";

  return (
    <PageWrapper
      title={`${AP_DOCUMENT_TYPE_LABELS[document.documentType]} from ${document.partyName}`}
      subtitle={
        document.vendorDocumentNumber
          ? `Their number ${document.vendorDocumentNumber}`
          : "No vendor number recorded"
      }
      backHref={backHref}
      backLabel="Back"
      actions={
        canApplyCredit ? (
          <ApplyVendorCreditAction document={document} />
        ) : canManage && isDraft ? (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => setIsDeleteOpen(true)}
            >
              Discard draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => setIsEditing((current) => !current)}
            >
              {isEditing ? "Stop editing" : "Edit"}
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none" onClick={() => setIsPostOpen(true)}>
              Put it in the books
            </Button>
          </div>
        ) : null
      }
    >
      <div className="grid flex-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {isEditing && isDraft ? (
            <BillEditorForm
              documentType={document.documentType}
              document={document}
              defaultCurrency={bookQuery.data?.baseCurrency ?? document.currency}
              onSaved={() => setIsEditing(false)}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <BillLinesTable lines={document.lines} currency={document.currency} />
          )}
        </div>

        <div className="space-y-4">
          <BillSummaryCard document={document} />
          {isDraft ? (
            <BillTaxPreviewCard
              apDocumentId={document.id}
              lineDescriptions={lineDescriptions}
            />
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={isPostOpen}
        onOpenChange={setIsPostOpen}
        title="Put this bill in the books?"
        description="Once it is in, the bill can no longer be edited. A mistake is corrected with a vendor credit, not an edit."
        confirmLabel="Put it in the books"
        isPending={postDocument.isPending}
        keepOpenOnConfirm
        onConfirm={handlePost}
      />

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Discard this draft?"
        description="Nothing has reached the books yet, so nothing is reversed. The draft is removed."
        confirmLabel="Discard draft"
        destructive
        isPending={deleteDocument.isPending}
        keepOpenOnConfirm
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
