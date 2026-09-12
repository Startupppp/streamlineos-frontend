"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useArchiveAccount } from "@/hooks/api/accounting/ledger-mutations";
import type { AccountNode } from "@/types/accounting-kernel";

interface ArchiveAccountDialogProps {
  account: AccountNode | null;
  onOpenChange: (open: boolean) => void;
}

export function ArchiveAccountDialog({ account, onOpenChange }: ArchiveAccountDialogProps) {
  const archiveAccount = useArchiveAccount();

  if (!account) return null;

  function handleConfirm() {
    if (!account) return;
    archiveAccount.mutate(account.id, {
      onSuccess: (result) => {
        if (result.deactivatedInsteadOfDeleted) {
          toast.success(
            `${account.name} was switched off rather than deleted, because ${result.postings} posting${result.postings === 1 ? "" : "s"} already reference it. Its history stays on your reports.`,
          );
        } else {
          toast.success(
            `${account.name} was deleted. Nothing had ever been posted to it.`,
          );
        }
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title={`Remove ${account.code} · ${account.name}?`}
      description="If anything has ever been posted to this account it is switched off instead of deleted, so past reports keep telling the truth. You will be told which happened."
      confirmLabel="Remove account"
      destructive
      isPending={archiveAccount.isPending}
      keepOpenOnConfirm
      onConfirm={handleConfirm}
    />
  );
}
