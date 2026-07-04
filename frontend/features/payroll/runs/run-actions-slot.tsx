"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  onChanged: () => void;
}

export function RunActionsSlot({ run, onChanged }: RunActionsSlotProps) {
  const [showRecalcConfirm, setShowRecalcConfirm] = useState(false);
  const canManage = useCan("payroll:runs:manage");

  const generateMutation = useGenerateRun();
  const recalcMutation = useRecalculateRun();

  function handleGenerate() {
    generateMutation.mutate(run.id, {
      onSuccess: () => {
        toast.success("Payroll generated successfully");
        onChanged();
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to generate payroll");
      },
    });
  }

  function handleRecalcConfirm() {
    recalcMutation.mutate(run.id, {
      onSuccess: () => {
        toast.success("Payroll recalculated");
        setShowRecalcConfirm(false);
        onChanged();
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to recalculate");
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
      <Button
        size="sm"
        variant="outline"
        onClick={handleRecalcRequest}
        disabled={recalcMutation.isPending}
      >
        Recalculate
      </Button>
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
            <AlertDialogAction
              onClick={handleRecalcConfirm}
              disabled={recalcMutation.isPending}
            >
              Recalculate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  ) : null;

  switch (run.status) {
    case "PREPARING":
      return canManage ? (
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
        >
          Generate
        </Button>
      ) : null;

    case "DRAFT":
    case "REOPENED":
      return recalcButton;

    case "PREVIEW_READY":
    case "EXCEPTIONS_FOUND":
      return (
        <>
          {recalcButton}
          <SubmitApprovalAction runId={run.id} status={run.status} onChanged={onChanged} />
        </>
      );

    case "PENDING_APPROVAL":
      return null;

    case "APPROVED":
    case "LOCKED":
    case "PAYSLIPS_PUBLISHED":
      return <LockActions runId={run.id} status={run.status} onChanged={onChanged} />;

    case "PAID":
      return <PublishPayslipsAction runId={run.id} status={run.status} onChanged={onChanged} />;

    case "CLOSED":
    default:
      return null;
  }
}
