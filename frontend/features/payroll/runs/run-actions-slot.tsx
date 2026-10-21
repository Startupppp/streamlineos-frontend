"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRunConflictHandler } from "@/features/payroll/shared/run-conflict";
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
import { useDiscardRun, useGenerateRun, useRecalculateRun } from "@/hooks/api/payroll/runs";
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
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const router = useRouter();
  const discardMutation = useDiscardRun();
  const canManage = useCan("payroll:runs:manage");

  const generateMutation = useGenerateRun();
  const recalcMutation = useRecalculateRun();
  const handleError = useRunConflictHandler(run.id);

  function handleGenerate() {
    generateMutation.mutate(run.id, {
      onSuccess: () => {
        toast.success("Payroll generated successfully");
      },
      onError: handleError,
    });
  }

  function handleRecalcConfirm() {
    recalcMutation.mutate(run.id, {
      onSuccess: () => {
        toast.success("Payroll recalculated");
        setShowRecalcConfirm(false);
      },
      onError: (err: unknown) => {
        handleError(err);
        setShowRecalcConfirm(false);
      },
    });
  }

  function handleDiscardRequest() {
    setShowDiscardConfirm(true);
  }

  function handleDiscardConfirm() {
    discardMutation.mutate(run.id, {
      onSuccess: () => {
        toast.success("Draft payroll run discarded");
        setShowDiscardConfirm(false);
        router.push("/payroll/runs");
      },
      onError: (err: unknown) => toast.error(getErrorMessage(err)),
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

  const discardButton = canManage ? (
    <>
      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDiscardRequest}>
        Discard
      </Button>
      <ConfirmDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        destructive
        isPending={discardMutation.isPending}
        keepOpenOnConfirm
        title="Discard this payroll run?"
        description="The run and its calculations are deleted. Inputs, adjustments and exceptions for this run are removed, and you can start a new run for the month."
        confirmLabel="Discard run"
        onConfirm={handleDiscardConfirm}
      />
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
      return (
        <>
          {recalcButton}
          {discardButton}
        </>
      );

    case "REOPENED":
      return recalcButton;

    case "PREVIEW_READY":
    case "EXCEPTIONS_FOUND":
      return (
        <>
          {recalcButton}
          {discardButton}
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
