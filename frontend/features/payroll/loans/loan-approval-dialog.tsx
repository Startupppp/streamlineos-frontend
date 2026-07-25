"use client";

import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
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
import { LoadingButton } from "@/components/ui/loading-button";
import { useUpdateLoanStatus } from "@/hooks/api/payroll/loans-admin";

export interface LoanApprovalDialogProps {
  loanId: number;
  action: "approve" | "reject";
  open: boolean;
  onClose: () => void;
}

export function LoanApprovalDialog({
  loanId,
  action,
  open,
  onClose,
}: LoanApprovalDialogProps) {
  const { mutate, isPending } = useUpdateLoanStatus();

  function handleOpenChange(value: boolean) {
    if (!value) onClose();
  }

  function handleConfirm() {
    mutate(
      { loanId, status: action === "approve" ? "APPROVED" : "REJECTED" },
      {
        onSuccess: () => {
          toast.success(action === "approve" ? "Loan approved" : "Loan rejected");
          onClose();
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action === "approve" ? "Approve Loan" : "Reject Loan"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {action === "approve"
              ? "This will approve the loan request. The employee can be disbursed once activated."
              : "This will reject the loan request. This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <LoadingButton
              variant={action === "reject" ? "destructive" : "default"}
              onClick={handleConfirm}
              isPending={isPending}
              loadingText="Processing…"
            >
              {action === "approve" ? "Approve" : "Reject"}
            </LoadingButton>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
