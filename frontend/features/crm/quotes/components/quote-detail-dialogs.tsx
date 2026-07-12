"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface QuoteDetailDialogsProps {
  rejectDialogOpen: boolean;
  onRejectDialogOpenChange: (open: boolean) => void;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onRejectConfirm: () => void;

  approvalRejectOpen: boolean;
  onApprovalRejectOpenChange: (open: boolean) => void;
  approvalRejectReason: string;
  onApprovalRejectReasonChange: (value: string) => void;
  onApprovalRejectConfirm: () => void;

  signedDialogOpen: boolean;
  onSignedDialogOpenChange: (open: boolean) => void;
  signedDocRef: string;
  onSignedDocRefChange: (value: string) => void;
  onMarkSignedConfirm: () => void;
}

function handleRejectTextareaChange(
  handler: (value: string) => void,
  e: React.ChangeEvent<HTMLTextAreaElement>,
) {
  handler(e.target.value);
}

function handleSignedInputChange(
  handler: (value: string) => void,
  e: React.ChangeEvent<HTMLInputElement>,
) {
  handler(e.target.value);
}

export function QuoteDetailDialogs({
  rejectDialogOpen,
  onRejectDialogOpenChange,
  rejectReason,
  onRejectReasonChange,
  onRejectConfirm,
  approvalRejectOpen,
  onApprovalRejectOpenChange,
  approvalRejectReason,
  onApprovalRejectReasonChange,
  onApprovalRejectConfirm,
  signedDialogOpen,
  onSignedDialogOpenChange,
  signedDocRef,
  onSignedDocRefChange,
  onMarkSignedConfirm,
}: QuoteDetailDialogsProps) {
  return (
    <>
      <AlertDialog open={rejectDialogOpen} onOpenChange={onRejectDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject quote?</AlertDialogTitle>
            <AlertDialogDescription>Optionally provide a reason for rejection.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Textarea
              placeholder="Rejection reason (optional)"
              value={rejectReason}
              onChange={(e) => handleRejectTextareaChange(onRejectReasonChange, e)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onRejectConfirm}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={approvalRejectOpen} onOpenChange={onApprovalRejectOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject approval request?</AlertDialogTitle>
            <AlertDialogDescription>Optionally provide a reason.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Textarea
              placeholder="Reason (optional)"
              value={approvalRejectReason}
              onChange={(e) => handleRejectTextareaChange(onApprovalRejectReasonChange, e)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onApprovalRejectConfirm}
            >
              Reject Approval
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={signedDialogOpen} onOpenChange={onSignedDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as signed?</AlertDialogTitle>
            <AlertDialogDescription>Optionally attach a document reference.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Input
              placeholder="Document reference (optional)"
              value={signedDocRef}
              onChange={(e) => handleSignedInputChange(onSignedDocRefChange, e)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onMarkSignedConfirm}>Mark Signed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
