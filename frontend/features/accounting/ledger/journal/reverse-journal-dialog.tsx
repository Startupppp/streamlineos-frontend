"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useReverseJournal } from "@/hooks/api/accounting/ledger-mutations";
import type { Journal } from "@/types/accounting/accounting-kernel";

interface ReverseJournalDialogProps {
  journal: Journal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReverseJournalDialog({
  journal,
  open,
  onOpenChange,
}: ReverseJournalDialogProps) {
  const router = useRouter();
  const reverseJournal = useReverseJournal();

  function handleConfirm() {
    reverseJournal.mutate(
      {
        journalId: journal.id,
        idempotencyKey: globalThis.crypto.randomUUID(),
        memo: `Reversal of ${journal.journalNumber}`,
      },
      {
        onSuccess: (reversal) => {
          toast.success(
            `Journal ${journal.journalNumber} reversed by ${reversal.journalNumber}`,
          );
          onOpenChange(false);
          router.push(`/accounting/journal/${reversal.id}`);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Reverse journal ${journal.journalNumber}?`}
      description="A posted journal is never edited or deleted. Reversing writes an equal and opposite entry, so both the original and the correction stay on the record."
      confirmLabel="Post the reversal"
      destructive
      isPending={reverseJournal.isPending}
      keepOpenOnConfirm
      onConfirm={handleConfirm}
    />
  );
}
