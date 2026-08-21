"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useCancelEngagement,
  useTerminateEngagement,
} from "@/hooks/api/directory/workers";
import { getErrorMessage } from "@/lib/get-error-message";
import type { WorkerEngagement } from "@/types/directory/workers";
import {
  formatWorkerEngagementDate,
  getWorkerTypeLabel,
} from "./worker-engagement-presentation";

function ConfirmationError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
    >
      {getErrorMessage(error)}
    </div>
  );
}

function TerminateEngagementDialog({
  open,
  onOpenChange,
  engagement,
  workerId,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagement: WorkerEngagement;
  workerId: string;
  onChanged: (workerEngagementId: string) => void;
}) {
  const terminateEngagement = useTerminateEngagement();
  const [error, setError] = useState<unknown>(null);

  function handleConfirm() {
    setError(null);
    terminateEngagement.mutate(
      {
        workerEngagementId: engagement.workerEngagementId,
        workerId,
        expectedVersion: engagement.rowVersion,
      },
      {
        onSuccess: () => {
          toast.success("Engagement terminated");
          onChanged(engagement.workerEngagementId);
          onOpenChange(false);
        },
        onError: setError,
      },
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Terminate this engagement?"
      description={
        <>
          This ends the {getWorkerTypeLabel(engagement.workerType).toLowerCase()}{" "}
          engagement started on {formatWorkerEngagementDate(engagement.startsOn)}.
          Its history will be preserved.
        </>
      }
      content={<ConfirmationError error={error} />}
      confirmLabel={error ? "Try again" : "Terminate"}
      destructive
      keepOpenOnConfirm
      isPending={terminateEngagement.isPending}
      onConfirm={handleConfirm}
    />
  );
}

function CancelPlannedEngagementDialog({
  open,
  onOpenChange,
  engagement,
  workerId,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagement: WorkerEngagement;
  workerId: string;
  onChanged: (workerEngagementId: string) => void;
}) {
  const cancelEngagement = useCancelEngagement();
  const [error, setError] = useState<unknown>(null);

  function handleConfirm() {
    setError(null);
    cancelEngagement.mutate(
      { workerEngagementId: engagement.workerEngagementId, workerId },
      {
        onSuccess: () => {
          toast.success("Planned engagement cancelled");
          onChanged(engagement.workerEngagementId);
          onOpenChange(false);
        },
        onError: setError,
      },
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Cancel this planned engagement?"
      description={
        <>
          This frees the dates reserved by the{" "}
          {getWorkerTypeLabel(engagement.workerType).toLowerCase()} plan starting
          on {formatWorkerEngagementDate(engagement.startsOn)}. The record stays in
          history and can still be audited.
        </>
      }
      content={<ConfirmationError error={error} />}
      confirmLabel={error ? "Try again" : "Cancel engagement"}
      destructive
      keepOpenOnConfirm
      isPending={cancelEngagement.isPending}
      onConfirm={handleConfirm}
    />
  );
}

interface WorkerEngagementRowActionsProps {
  engagement: WorkerEngagement;
  workerId: string;
  canManage: boolean;
  canTerminate: boolean;
  onEdit: (engagement: WorkerEngagement) => void;
  onChanged: (workerEngagementId: string) => void;
}

export function WorkerEngagementRowActions({
  engagement,
  workerId,
  canManage,
  canTerminate,
  onEdit,
  onChanged,
}: WorkerEngagementRowActionsProps) {
  const [confirmationKind, setConfirmationKind] = useState<
    "cancel" | "terminate" | null
  >(null);
  const canEditPlan = canManage && engagement.status === "PLANNED";
  const canCancelPlan = canManage && engagement.status === "PLANNED";
  const canEndActive = canTerminate && engagement.status === "ACTIVE";

  if (!canEditPlan && !canCancelPlan && !canEndActive) return null;

  function handleEdit() {
    onEdit(engagement);
  }

  function handleDestructiveAction() {
    setConfirmationKind(canCancelPlan ? "cancel" : "terminate");
  }

  function handleOpenChange(open: boolean) {
    if (!open) setConfirmationKind(null);
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {canEditPlan ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={handleEdit}
          >
            <Pencil className="size-3" aria-hidden="true" />
            Edit
          </Button>
        ) : null}
        {canCancelPlan || canEndActive ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDestructiveAction}
          >
            {canCancelPlan ? "Cancel plan" : "Terminate"}
          </Button>
        ) : null}
      </div>
      {confirmationKind === "cancel" ? (
        <CancelPlannedEngagementDialog
          open
          onOpenChange={handleOpenChange}
          engagement={engagement}
          workerId={workerId}
          onChanged={onChanged}
        />
      ) : null}
      {confirmationKind === "terminate" ? (
        <TerminateEngagementDialog
          open
          onOpenChange={handleOpenChange}
          engagement={engagement}
          workerId={workerId}
          onChanged={onChanged}
        />
      ) : null}
    </>
  );
}
