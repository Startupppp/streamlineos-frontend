"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCan } from "@/hooks/api/access";
import { useReopenRun } from "@/hooks/api/payroll/approvals";
import { getErrorMessage } from "@/lib/get-error-message";

const DEFAULT_REASON = "Regenerate after salary profiles were added";

export function RunReopenAction({ runId }: { runId: number }) {
  const canManage = useCan("payroll:runs:manage");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(DEFAULT_REASON);
  const reopen = useReopenRun();

  if (!canManage) return null;

  function handleOpen() {
    setReason(DEFAULT_REASON);
    setOpen(true);
  }

  function handleConfirm() {
    const trimmed = reason.trim();
    if (!trimmed) return;
    reopen.mutate(
      { runId, reason: trimmed },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success("Run reopened. Recalculate to include the latest salary profiles.");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen}>
        <LockOpen className="mr-1.5 h-4 w-4" />
        Reopen run
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        keepOpenOnConfirm
        isPending={reopen.isPending}
        confirmDisabled={!reason.trim()}
        title="Reopen this payroll run?"
        description="Reopening sends the run back so it can be regenerated. Salary profiles added after it was submitted are included the next time you recalculate."
        confirmLabel="Reopen run"
        onConfirm={handleConfirm}
        content={
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-[80px]"
            aria-label="Reason for reopening"
          />
        }
      />
    </>
  );
}
