"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { CycleFormSheet } from "./cycle-form-sheet";
import { CycleCompletionSheet } from "./cycle-completion-sheet";
import { CyclePlanningSheet } from "./cycle-planning-sheet";
import type { Cycle, Ticket } from "@/types/projects";

interface CyclesDialogsProps {
  projectId: number;
  cycles: Cycle[];
  upcomingCycles: Cycle[];
  tickets: Ticket[];
  projectStatuses: Array<{ name: string; type?: string | null }>;
  canManage: boolean;
  formOpen: boolean;
  editTarget: Cycle | null;
  statusTarget: Cycle | null;
  planningTarget: Cycle | null;
  completionTarget: Cycle | null;
  completionMoveTo: "backlog" | "next";
  deleteTarget: Cycle | null;
  shortcutHelpOpen: boolean;
  updateIsPending: boolean;
  bulkIsPending: boolean;
  deleteIsPending: boolean;
  onFormOpenChange: (open: boolean) => void;
  onStatusOpenChange: (open: boolean) => void;
  onPlanningOpenChange: (open: boolean) => void;
  onCompletionCancel: () => void;
  onCompletionMoveToChange: (value: "backlog" | "next") => void;
  onDeleteOpenChange: (open: boolean) => void;
  onShortcutHelpOpenChange: (open: boolean) => void;
  onConfirmStatus: () => void;
  onConfirmCompletion: (targetCycleId: number | null) => Promise<void>;
  onConfirmDelete: () => void;
}

export function CyclesDialogs({
  projectId,
  cycles,
  upcomingCycles,
  tickets,
  projectStatuses,
  canManage,
  formOpen,
  editTarget,
  statusTarget,
  planningTarget,
  completionTarget,
  completionMoveTo,
  deleteTarget,
  shortcutHelpOpen,
  updateIsPending,
  bulkIsPending,
  deleteIsPending,
  onFormOpenChange,
  onStatusOpenChange,
  onPlanningOpenChange,
  onCompletionCancel,
  onCompletionMoveToChange,
  onDeleteOpenChange,
  onShortcutHelpOpenChange,
  onConfirmStatus,
  onConfirmCompletion,
  onConfirmDelete,
}: CyclesDialogsProps) {
  const statusAction = statusTarget
    ? statusTarget.status === "draft"
      ? "Start"
      : statusTarget.status === "active"
        ? "Complete"
        : "Reopen"
    : "Update";

  return (
    <>
      {canManage ? (
        <CycleFormSheet
          projectId={projectId}
          cycles={cycles}
          cycle={editTarget}
          open={formOpen}
          onOpenChange={onFormOpenChange}
        />
      ) : null}

      <ConfirmDialog
        open={statusTarget !== null}
        onOpenChange={onStatusOpenChange}
        title={`${statusAction} cycle?`}
        description={
          statusTarget?.status === "completed"
            ? "This cycle will return to the active section."
            : statusTarget?.status === "active"
              ? "This cycle will move to the completed section and can be reopened later."
              : "This cycle will become the active cycle for the project."
        }
        confirmLabel={statusAction}
        isPending={updateIsPending}
        onConfirm={onConfirmStatus}
      />

      <CyclePlanningSheet
        cycle={planningTarget}
        tickets={tickets}
        projectId={projectId}
        open={planningTarget !== null}
        onOpenChange={onPlanningOpenChange}
      />

      <CycleCompletionSheet
        cycle={completionTarget}
        nextCycle={upcomingCycles.find(
          (cycle) => cycle.id !== completionTarget?.id,
        )}
        tickets={tickets}
        projectStatuses={projectStatuses}
        moveTo={completionMoveTo}
        isPending={bulkIsPending || updateIsPending}
        onMoveToChange={onCompletionMoveToChange}
        onCancel={onCompletionCancel}
        onConfirm={onConfirmCompletion}
      />

      <ShortcutHelpDialog
        open={shortcutHelpOpen}
        onOpenChange={onShortcutHelpOpenChange}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={onDeleteOpenChange}
        title="Delete cycle?"
        description={`${deleteTarget?.name ?? "This cycle"} will be permanently deleted. Its tickets will remain in the project without a cycle.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteIsPending}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
