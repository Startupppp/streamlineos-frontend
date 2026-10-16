"use client";

import { useState, type SyntheticEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useVoidAdjustment } from "@/hooks/api/payroll/run-employees";
import { getErrorMessage } from "@/lib/get-error-message";

const ADJUSTMENT_CODE = /^ADJ-(?:EARNING|DEDUCTION)-(\d+)$/;

export function adjustmentIdFromCode(code: string): number | null {
  const match = ADJUSTMENT_CODE.exec(code);
  return match ? Number(match[1]) : null;
}

interface AdjustmentRemoveActionProps {
  runId: number;
  runEmployeeId: number;
  adjustmentId: number;
  name: string;
}

export function AdjustmentRemoveAction({ runId, runEmployeeId, adjustmentId, name }: AdjustmentRemoveActionProps) {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useVoidAdjustment(runId, runEmployeeId);

  function handleOpen() {
    setOpen(true);
  }

  function stopRowToggle(event: SyntheticEvent) {
    event.stopPropagation();
  }

  function handleConfirm() {
    mutate(adjustmentId, {
      onSuccess: () => {
        toast.success(`Removed adjustment "${name}" and recalculated the run`);
        setOpen(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <span onClick={stopRowToggle} onKeyDown={stopRowToggle}>
      <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleOpen}>
        Remove
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        destructive
        isPending={isPending}
        keepOpenOnConfirm
        title="Remove this adjustment?"
        description={`"${name}" will be taken out of this employee's pay and the run will be recalculated.`}
        confirmLabel="Remove adjustment"
        onConfirm={handleConfirm}
      />
    </span>
  );
}
