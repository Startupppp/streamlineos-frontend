"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import type { ReturnStatus } from "@/hooks/api/inventory/returns";

export interface ReturnRowActionsProps {
  returnNumber: string;
  status: ReturnStatus;
  canManage: boolean;
  isPosting: boolean;
  /** Customer returns only — a vendor return has nothing to inspect. */
  onInspect?: () => void;
  onApprove: () => void;
  onPost: () => void;
  onCancel: () => void;
}

/**
 * B9, item 1 — the ladder, rendered as a ladder.
 *
 * A DRAFT return offers the step that comes next, not the last step: `Post` used
 * to sit on a draft nobody had signed off, which is how a disposition guessed
 * from the customer's description reached the ledger. Both directions get the
 * same rungs — that is what "same discipline" means for the vendor side.
 */
export function ReturnRowActions({
  returnNumber,
  status,
  canManage,
  isPosting,
  onInspect,
  onApprove,
  onPost,
  onCancel,
}: ReturnRowActionsProps) {
  if (!canManage || (status !== "DRAFT" && status !== "APPROVED")) return null;

  return (
    <div className="flex items-center gap-1.5">
      {status === "DRAFT" && onInspect ? (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-micro" onClick={onInspect}>
          Inspect
        </Button>
      ) : null}
      {status === "DRAFT" ? (
        <Button variant="outline" size="sm" className="h-7 px-2 text-micro" onClick={onApprove}>
          Approve
        </Button>
      ) : (
        <LoadingButton
          variant="outline"
          size="sm"
          className="h-7 px-2 text-micro"
          onClick={onPost}
          isPending={isPosting}
          loadingText="Posting…"
        >
          Post
        </LoadingButton>
      )}
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="sm" className="h-7 px-2 text-micro text-destructive">
            Cancel
          </Button>
        }
        title={`Cancel ${returnNumber}?`}
        description="The return is closed without moving any stock. This cannot be undone."
        confirmLabel="Cancel return"
        cancelLabel="Keep"
        destructive
        onConfirm={onCancel}
      />
    </div>
  );
}
