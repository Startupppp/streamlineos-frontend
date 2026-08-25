"use client";

import { useCallback } from "react";
import {
  Send,
  CheckCircle2,
  XCircle,
  Trash2,
  FileCheck2,
  Receipt,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Quote } from "@/types/crm/quotes";

interface QuoteActionBarProps {
  quote: Quote;
  canApprove: boolean;
  onEdit: () => void;
  onSend: () => void;
  onAccept: () => void;
  onRejectOpen: () => void;
  onApprove: () => void;
  onApprovalRejectOpen: () => void;
  onConvertToInvoice: () => void;
  onMarkSignedOpen: () => void;
  onDelete: () => void;
  updateStatusPending: boolean;
  approvePending: boolean;
  rejectPending: boolean;
  convertPending: boolean;
  deletePending: boolean;
}

export function QuoteActionBar({
  quote,
  canApprove,
  onEdit,
  onSend,
  onAccept,
  onRejectOpen,
  onApprove,
  onApprovalRejectOpen,
  onConvertToInvoice,
  onMarkSignedOpen,
  onDelete,
  updateStatusPending,
  approvePending,
  rejectPending,
  convertPending,
  deletePending,
}: QuoteActionBarProps) {
  const canSend = quote.status === "DRAFT" && quote.approvalStatus !== "pending";
  const canAcceptOrReject = quote.status === "SENT";
  const canDelete = quote.status === "DRAFT";
  const canConvert = quote.status === "ACCEPTED" && quote.convertedInvoiceId === null;
  const canMarkSigned = quote.status === "ACCEPTED" && quote.signedAt === null;

  const handleEditClick = useCallback(() => onEdit(), [onEdit]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {canApprove && quote.approvalStatus === "pending" && (
        <>
          <LoadingButton
            size="sm"
            className="bg-status-success-fill hover:bg-status-success-fill-hover text-white"
            onClick={onApprove}
            isPending={approvePending}
            loadingText="Approving..."
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Approve
          </LoadingButton>
          <LoadingButton
            size="sm"
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={onApprovalRejectOpen}
            isPending={rejectPending}
            loadingText="Rejecting..."
          >
            Reject Approval
          </LoadingButton>
        </>
      )}
      {quote.status === "DRAFT" && (
        <Button size="sm" variant="outline" onClick={handleEditClick}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Edit
        </Button>
      )}
      {canSend && (
        <LoadingButton
          size="sm"
          variant="outline"
          onClick={onSend}
          isPending={updateStatusPending}
          title={quote.approvalStatus === "pending" ? "Pending approval" : undefined}
        >
          <Send className="h-3.5 w-3.5 mr-1.5" />
          Send
        </LoadingButton>
      )}
      {canAcceptOrReject && (
        <>
          <LoadingButton
            size="sm"
            variant="outline"
            className="text-status-success-ink border-status-success-rule hover:bg-status-success-surface"
            onClick={onAccept}
            isPending={updateStatusPending}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Accept
          </LoadingButton>
          <LoadingButton
            size="sm"
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={onRejectOpen}
            isPending={updateStatusPending}
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            Reject
          </LoadingButton>
        </>
      )}
      {canConvert && (
        <LoadingButton
          size="sm"
          variant="outline"
          onClick={onConvertToInvoice}
          isPending={convertPending}
          loadingText="Converting..."
        >
          <Receipt className="h-3.5 w-3.5 mr-1.5" />
          Convert to Invoice
        </LoadingButton>
      )}
      {canMarkSigned && (
        <Button size="sm" variant="outline" onClick={onMarkSignedOpen}>
          <FileCheck2 className="h-3.5 w-3.5 mr-1.5" />
          Mark Signed
        </Button>
      )}
      {canDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete quote?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The quote will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onDelete}
                disabled={deletePending}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
