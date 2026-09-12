"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMinorMoney } from "@/lib/accounting/money";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useCan } from "@/hooks/api/access";
import {
  CREDIT_NOTES_MANAGE,
  CREDIT_NOTES_READ,
  useAllocateCreditNote,
  useCreditNote,
  useCreditNoteTaxPreview,
  useDeleteCreditNoteDraft,
  usePostCreditNote,
  useUpdateCreditNoteDraft,
} from "@/hooks/api/accounting/ar";
import { usePartyNames } from "../parties/use-party-names";
import type { AllocationLineInput } from "@/types/accounting-ar-receipts";
import { AllocationEditorDialog } from "./allocation-editor-dialog";
import { ArStatusBadge } from "./ar-labels";
import { ArDraftEditor } from "./ar-draft-editor";
import { readArRejection } from "./ar-document-errors";
import { ArDocumentLinesCard, ArDocumentTotalsCard } from "./ar-document-readonly";
import {
  documentRevision,
  toUpdateDocumentInput,
  type ArDocumentFormValues,
} from "./ar-document-schema";

const PREVIEW_DEBOUNCE_MS = 400;

export function CreditNoteDetailClient({ creditNoteId }: { creditNoteId: string }) {
  const canRead = useCan(CREDIT_NOTES_READ);
  const canManage = useCan(CREDIT_NOTES_MANAGE);
  const router = useRouter();

  const [errorLineIndex, setErrorLineIndex] = useState<number | undefined>(undefined);
  const [postOpen, setPostOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const creditNoteQuery = useCreditNote(creditNoteId);
  const creditNote = creditNoteQuery.data;
  const isDraft = creditNote?.status === "DRAFT";

  const revision = creditNote ? documentRevision(creditNote) : "";
  const debouncedRevision = useDebouncedValue(revision, PREVIEW_DEBOUNCE_MS);
  const previewQuery = useCreditNoteTaxPreview(creditNoteId, debouncedRevision, {
    enabled: isDraft && debouncedRevision.length > 0,
  });

  const partyNames = usePartyNames(creditNote ? [creditNote.partyId] : []);
  const updateDraft = useUpdateCreditNoteDraft();
  const deleteDraft = useDeleteCreditNoteDraft();
  const postCreditNote = usePostCreditNote();
  const allocate = useAllocateCreditNote();

  function handleFailure(error: unknown): void {
    const rejection = readArRejection(error);
    setErrorLineIndex(rejection?.lineIndex);
    toast.error(getErrorMessage(error));
  }

  async function handleSave(values: ArDocumentFormValues): Promise<void> {
    setErrorLineIndex(undefined);
    try {
      await updateDraft.mutateAsync({ creditNoteId, input: toUpdateDocumentInput(values) });
      toast.success("Draft saved");
    } catch (error) {
      handleFailure(error);
      throw error;
    }
  }

  function handlePost(): void {
    postCreditNote.mutate(creditNoteId, {
      onSuccess: () => {
        toast.success("Credit note posted");
        setPostOpen(false);
      },
      onError: (error) => {
        handleFailure(error);
        setPostOpen(false);
      },
    });
  }

  function handleApplyCreditNote(allocations: AllocationLineInput[]): void {
    allocate.mutate(
      { creditNoteId, allocations },
      {
        onSuccess: () => {
          toast.success("Credit note applied");
          setApplyOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleDelete(): void {
    deleteDraft.mutate(creditNoteId, {
      onSuccess: () => {
        toast.success("Draft deleted");
        router.push("/accounting/credit-notes");
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteOpen(false);
      },
    });
  }

  if (!canRead) {
    return (
      <PageWrapper title="Credit note" backHref="/accounting/credit-notes">
        <NoPermissionState permission={CREDIT_NOTES_READ} />
      </PageWrapper>
    );
  }

  if (creditNoteQuery.isError) {
    return (
      <PageWrapper title="Credit note" backHref="/accounting/credit-notes">
        <ErrorState
          className="flex-1"
          title="Couldn't load this credit note"
          description={getErrorMessage(creditNoteQuery.error)}
          onRetry={() => void creditNoteQuery.refetch()}
        />
      </PageWrapper>
    );
  }

  if (creditNoteQuery.isPending || !creditNote) {
    return (
      <PageWrapper title="Credit note" backHref="/accounting/credit-notes">
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  const partyName = partyNames.resolve(creditNote.partyId);
  const canApply = canManage && !isDraft && creditNote.openMinor > 0;

  return (
    <PageWrapper
      title={creditNote.documentNumber ?? "Unissued draft credit note"}
      subtitle={`${partyName} · ${formatMinorMoney(creditNote.grossMinor, creditNote.currency)}`}
      badge={<ArStatusBadge status={creditNote.status} />}
      backHref="/accounting/credit-notes"
      backLabel="Back to credit notes"
      actions={
        canApply ? (
          <Button size="sm" variant="outline" onClick={() => setApplyOpen(true)}>
            Apply to invoices
          </Button>
        ) : null
      }
    >
      {isDraft && canManage ? (
        <ArDraftEditor
          arDocument={creditNote}
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
                Post this credit note
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
            <ArDocumentLinesCard arDocument={creditNote} />
          </div>
          <div className="w-full lg:max-w-sm">
            <ArDocumentTotalsCard arDocument={creditNote} partyName={partyName} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={postOpen}
        onOpenChange={setPostOpen}
        title="Post this credit note?"
        description={`Posting writes ${formatMinorMoney(creditNote.grossMinor, creditNote.currency)} back into your books and locks the note. You can then apply it to their open invoices.`}
        confirmLabel="Post credit note"
        isPending={postCreditNote.isPending}
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

      <AllocationEditorDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        title="Apply this credit note"
        description="Choose which invoices it should reduce."
        partyId={creditNote.partyId}
        currency={creditNote.currency}
        availableMinor={creditNote.openMinor}
        isPending={allocate.isPending}
        onSubmit={handleApplyCreditNote}
      />
    </PageWrapper>
  );
}
