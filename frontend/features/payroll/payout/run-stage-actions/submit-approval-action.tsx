"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SendIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCan } from "@/hooks/api/access";
import { useSubmitApproval } from "@/hooks/api/payroll";
import { getErrorMessage } from "@/lib/get-error-message";

interface Props {
  runId: number;
  status: string;
}

const SUBMIT_STATUSES = new Set(["PREVIEW_READY", "EXCEPTIONS_FOUND"]);

export function SubmitApprovalAction({ runId, status }: Props) {
  const canUpdate = useCan("payroll:runs:update");
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useSubmitApproval();

  if (!SUBMIT_STATUSES.has(status)) return null;
  if (!canUpdate) return null;

  function handleOpen() {
    setOpen(true);
  }

  function handleCancel() {
    setOpen(false);
  }

  function handleConfirm() {
    mutate(
      { runId },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success("Submitted for approval");
        },
        onError: (err) => {
          const msg = getErrorMessage(err);
          const detail =
            msg.toLowerCase().includes("blocker")
              ? `${msg} Visit the Exceptions tab to resolve them.`
              : msg;
          toast.error(detail);
        },
      },
    );
  }

  return (
    <>
      <AnimatedIconButton icon={SendIcon} iconSize={16} iconClassName="mr-1.5" size="sm" className="h-9" onClick={handleOpen}>
        Submit for approval
      </AnimatedIconButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for Approval</DialogTitle>
            <DialogDescription>
              This will move the payroll run through the approval workflow.
            </DialogDescription>
          </DialogHeader>

          {status === "EXCEPTIONS_FOUND" && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
              ⚠ This run has open exceptions. Blockers will prevent submission — the server will
              error if any remain.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
