"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
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
} from "@/components/ui/alert-dialog";
import { useCan } from "@/hooks/api/access";
import { useGenerateRun, useRecalculateRun } from "@/hooks/api/payroll/runs";
import {
  SubmitApprovalAction,
  LockActions,
  PublishPayslipsAction,
} from "@/features/payroll/payout";
import type { PayrollRun } from "@/types/payroll/runs";

interface RunActionsSlotProps {
  run: PayrollRun;
}

export function RunActionsSlot({ run }: RunActionsSlotProps) {
  const [showRecalcConfirm, setShowRecalcConfirm] = useState(false);
  const canManage = useCan("payroll:runs:manage");

  const generateMutation = useGenerateRun();
  const recalcMutation = useRecalculateRun();

  function handleGenerate() {
    generateMutation.mutate(run.id, {
      onSuccess: () => {
        toast.success("Payroll generated successfully");
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }

  function handleRecalcConfirm() {
    recalcMutation.mutate(run.id, {
      onSuccess: () => {
        toast.success("Payroll recalculated");
        setShowRecalcConfirm(false);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
        setShowRecalcConfirm(false);
      },
    });
  }

  function handleRecalcRequest() {
    setShowRecalcConfirm(true);
  }

  function handleRecalcCancel() {
    setShowRecalcConfirm(false);
  }

  const recalcButton = canManage ? (
    <>
      <LoadingButton
        size="sm"
        variant="outline"
        onClick={handleRecalcRequest}
        isPending={recalcMutation.isPending}
      >
        Recalculate
      </LoadingButton>
      <AlertDialog open={showRecalcConfirm} onOpenChange={setShowRecalcConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recalculate payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              Recalculation replaces the current preview. All prior calculations
              will be recomputed from current inputs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRecalcCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <LoadingButton
                onClick={handleRecalcConfirm}
                isPending={recalcMutation.isPending}
                loadingText="Recalculating…"
              >
                Recalculate
              </LoadingButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  ) : null;

  switch (run.status) {
    case "PREPARING":
      return canManage ? (
        <LoadingButton
          size="sm"
          onClick={handleGenerate}
          isPending={generateMutation.isPending}
          loadingText="Generating…"
        >
          Generate
        </LoadingButton>
      ) : null;

    case "DRAFT":
    case "REOPENED":
      return recalcButton;

    case "PREVIEW_READY":
    case "EXCEPTIONS_FOUND":
      return (
        <>
          {recalcButton}
          <SubmitApprovalAction runId={run.id} status={run.status} />
        </>
      );

    case "PENDING_APPROVAL":
      return null;

    case "APPROVED":
    case "LOCKED":
    case "PAYSLIPS_PUBLISHED":
      return <LockActions runId={run.id} status={run.status} />;

    case "PAID":
      return <PublishPayslipsAction runId={run.id} status={run.status} />;

    case "CLOSED":
    default:
      return null;
  }
}
