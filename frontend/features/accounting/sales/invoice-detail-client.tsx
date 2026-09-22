"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMinorMoney } from "@/lib/accounting/money";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  CREDIT_NOTES_CREATE,
  RECEIVABLES_MANAGE,
  RECEIVABLES_READ,
  TAXES_READ,
  useArInvoice,
  useArInvoiceTaxLines,
  useArInvoiceTaxPreview,
  useDeleteArInvoiceDraft,
  usePostArInvoice,
  useUpdateArInvoiceDraft,
} from "@/hooks/api/accounting/ar";
import { usePartyNames } from "../parties/use-party-names";
import { ArStatusBadge } from "./ar-labels";
import { ArDraftEditor } from "./ar-draft-editor";
import { readArRejection } from "./ar-document-errors";
import {
  ArDocumentLinesCard,
  ArDocumentTotalsCard,
  FrozenTaxLinesCard,
} from "./ar-document-readonly";
import { CreditNoteFromInvoiceDialog } from "./credit-note-from-invoice-dialog";
import { documentRevision, toUpdateDocumentInput, type ArDocumentFormValues } from "./ar-document-schema";

const PREVIEW_DEBOUNCE_MS = 400;

export function InvoiceDetailClient({ invoiceId }: { invoiceId: string }) {
  const canManage = useCan(RECEIVABLES_MANAGE);
  const canCredit = useCan(CREDIT_NOTES_CREATE);
  const canReadTax = useCan(TAXES_READ);
  const router = useRouter();

  const [errorLineIndex, setErrorLineIndex] = useState<number | undefined>(undefined);
  const [postOpen, setPostOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);

  const invoiceQuery = useArInvoice(invoiceId);
  const invoice = invoiceQuery.data;
  const isDraft = invoice?.status === "DRAFT";

  const revision = invoice ? documentRevision(invoice) : "";
  const debouncedRevision = useDebouncedValue(revision, PREVIEW_DEBOUNCE_MS);
  const previewQuery = useArInvoiceTaxPreview(invoiceId, debouncedRevision, {
    enabled: isDraft && debouncedRevision.length > 0,
  });
  const taxLinesQuery = useArInvoiceTaxLines(invoiceId, {
    enabled: canReadTax && invoice !== undefined && !isDraft,
  });

  const partyNames = usePartyNames(invoice ? [invoice.partyId] : []);
  const updateDraft = useUpdateArInvoiceDraft();
  const deleteDraft = useDeleteArInvoiceDraft();
  const postInvoice = usePostArInvoice();

  const pageState = usePageState({
    permission: RECEIVABLES_READ,
    isLoading: invoiceQuery.isLoading,
    isError: invoiceQuery.isError,
    error: invoiceQuery.error,
  });
  const handleRetry = useCallback(() => { void invoiceQuery.refetch(); }, [invoiceQuery]);

  function handleFailure(error: unknown): void {
    const rejection = readArRejection(error);
    setErrorLineIndex(rejection?.lineIndex);
    toast.error(getErrorMessage(error));
  }

  async function handleSave(values: ArDocumentFormValues): Promise<void> {
    setErrorLineIndex(undefined);
    try {
      await updateDraft.mutateAsync({ invoiceId, input: toUpdateDocumentInput(values) });
      toast.success("Draft saved");
    } catch (error) {
      handleFailure(error);
      throw error;
    }
  }

  function handlePost(): void {
    setErrorLineIndex(undefined);
    postInvoice.mutate(invoiceId, {
      onSuccess: () => {
        toast.success("Invoice posted");
        setPostOpen(false);
      },
      onError: (error) => {
        handleFailure(error);
        setPostOpen(false);
      },
    });
  }

  function handleDelete(): void {
    deleteDraft.mutate(invoiceId, {
      onSuccess: () => {
        toast.success("Draft deleted");
        router.push("/accounting/invoices");
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteOpen(false);
      },
    });
  }

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Invoice" backHref="/accounting/invoices">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  if (invoiceQuery.isPending || !invoice) {
    return (
      <PageWrapper title="Invoice" backHref="/accounting/invoices">
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  const title = invoice.documentNumber ?? "Unsent draft invoice";
  const partyName = partyNames.resolve(invoice.partyId);

  return (
    <PageWrapper
      title={title}
      subtitle={`${partyName} · ${formatMinorMoney(invoice.grossMinor, invoice.currency)}`}
      badge={<ArStatusBadge status={invoice.status} />}
      backHref="/accounting/invoices"
      backLabel="Back to invoices"
      actions={
        !isDraft && canCredit ? (
          <Button size="sm" variant="outline" onClick={() => setCreditOpen(true)}>
            Issue credit note
          </Button>
        ) : null
      }
    >
      {isDraft ? (
        canManage ? (
          <ArDraftEditor
            arDocument={invoice}
            onSave={handleSave}
            isSaving={updateDraft.isPending}
            errorLineIndex={errorLineIndex}
            saveLabel="Save draft"
            preview={{
              data: previewQuery.data,
              isLoading: previewQuery.isLoading,
              isFetching: previewQuery.isFetching,
              error: previewQuery.error,
            }}
            actions={
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={updateDraft.isPending}
                  onClick={() => setPostOpen(true)}
                >
                  Post this invoice
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete draft
                </Button>
              </>
            }
          />
        ) : (
          <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <ArDocumentLinesCard arDocument={invoice} />
            </div>
            <div className="w-full lg:max-w-sm">
              <ArDocumentTotalsCard arDocument={invoice} partyName={partyName} />
            </div>
          </div>
        )
      ) : (
        <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <ArDocumentLinesCard arDocument={invoice} />
          </div>
          <div className="flex w-full flex-col gap-4 lg:max-w-sm">
            <ArDocumentTotalsCard arDocument={invoice} partyName={partyName} />
            {canReadTax ? (
              <FrozenTaxLinesCard
                lines={taxLinesQuery.data ?? []}
                currency={invoice.currency}
              />
            ) : null}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={postOpen}
        onOpenChange={setPostOpen}
        title="Post this invoice?"
        description={`Posting writes ${formatMinorMoney(invoice.grossMinor, invoice.currency)} into your books and locks the invoice. To change it afterwards you issue a credit note.`}
        confirmLabel="Post invoice"
        isPending={postInvoice.isPending}
        onConfirm={handlePost}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this draft?"
        description="Nothing has reached your books yet, so this simply removes the draft."
        confirmLabel="Delete draft"
        destructive
        isPending={deleteDraft.isPending}
        onConfirm={handleDelete}
      />

      <CreditNoteFromInvoiceDialog
        open={creditOpen}
        onOpenChange={setCreditOpen}
        invoiceId={invoice.id}
        invoiceNumber={invoice.documentNumber}
      />
    </PageWrapper>
  );
}
