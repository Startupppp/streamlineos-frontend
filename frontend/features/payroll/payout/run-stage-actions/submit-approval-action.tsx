"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { useRunExceptions } from "@/hooks/api/payroll/run-exceptions";
import { getErrorMessage } from "@/lib/get-error-message";

interface Props {
  runId: number;
  status: string;
  openBlockers?: number;
}

const SUBMIT_STATUSES = new Set(["PREVIEW_READY", "EXCEPTIONS_FOUND"]);

export function SubmitApprovalAction({ runId, status, openBlockers: openBlockersProp }: Props) {
  const canUpdate = useCan("payroll:runs:update");
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useSubmitApproval();
  const { data: blockerPage, isPending: blockersPending } = useRunExceptions(runId, { severity: "BLOCKER", status: "OPEN" });
  const blockersUnknown = openBlockersProp === undefined && blockersPending;
  // total, not data.length: the first page alone undercounts a long blocker list.
  const openBlockers = openBlockersProp ?? blockerPage?.pagination.total ?? blockerPage?.data.length ?? 0;

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

  const blockedReason = blockersUnknown
    ? "Checking for open blockers"
    : openBlockers > 0
      ? `Resolve ${openBlockers} open ${openBlockers === 1 ? "blocker" : "blockers"} before submitting`
      : null;

  return (
    <>
      <AnimatedIconButton
        icon={SendIcon}
        iconSize={16}
        iconClassName="mr-1.5"
        size="sm"
        className="h-9"
        onClick={handleOpen}
        disabled={blockedReason !== null}
        aria-describedby={blockedReason ? `submit-blocked-${runId}` : undefined}
      >
        Submit for Approval
      </AnimatedIconButton>
      {blockedReason ? (
        <span id={`submit-blocked-${runId}`} className="text-dense text-muted-foreground">
          {blockedReason}
        </span>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for Approval</DialogTitle>
            <DialogDescription>
              This will move the payroll run through the approval workflow.
            </DialogDescription>
          </DialogHeader>

          {status === "EXCEPTIONS_FOUND" && (
            <div className="rounded-md bg-status-warning-surface border border-status-warning-rule px-4 py-3 text-sm text-status-warning-ink">
              ⚠ This run has open exceptions. Blockers will prevent submission — the server will
              error if any remain.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
            <LoadingButton onClick={handleConfirm} isPending={isPending} loadingText="Submitting…">
              Submit
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
