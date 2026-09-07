"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { AppDialog } from "@/components/shared/app-dialog";
import { RecordForm, type RecordFormValues } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import {
  CALL_DIRECTION_LABELS,
  CALL_LOG_LAYOUT,
  CALL_OUTCOME_LABELS,
} from "@/lib/renderer/crm/call-log-layout";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateTask, type TaskEntityType } from "@/hooks/api/tasks";

interface CallLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: TaskEntityType;
  entityId: number;
}

function summarise(values: RecordFormValues): string {
  const parts = [
    `Direction: ${CALL_DIRECTION_LABELS[values.direction] ?? values.direction}`,
    `Outcome: ${CALL_OUTCOME_LABELS[values.outcome] ?? values.outcome}`,
  ];
  if (values.durationMinutes) parts.push(`Duration: ${values.durationMinutes} min`);
  if (values.calledAt) parts.push(`Called at: ${values.calledAt}`);
  if (values.notes) parts.push(`\nNotes:\n${values.notes}`);
  return parts.join("\n");
}

export function CallLogDialog({ open, onOpenChange, entityType, entityId }: CallLogDialogProps) {
  const layout = useTenantLayout(CALL_LOG_LAYOUT);
  const createTask = useCreateTask();

  const handleSubmit = useCallback(
    (values: RecordFormValues) => {
      const direction = CALL_DIRECTION_LABELS[values.direction] ?? values.direction;
      const outcome = CALL_OUTCOME_LABELS[values.outcome] ?? values.outcome;

      createTask.mutate(
        {
          title: `Call: ${direction} – ${outcome}`,
          type: "CALL",
          notes: summarise(values),
          entityType,
          entityId,
        },
        {
          onSuccess: () => {
            toast.success("Call logged");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createTask, entityType, entityId, onOpenChange],
  );

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Log call"
      description="Record details of a completed or attempted call."
    >
      <RecordForm
        key={String(open)}
        layout={layout}
        mode="create"
        initial={{
          direction: "OUTBOUND",
          outcome: "CONNECTED",
          calledAt: new Date().toISOString().slice(0, 16),
        }}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
        isSubmitting={createTask.isPending}
        submitLabel="Log call"
      />
    </AppDialog>
  );
}
