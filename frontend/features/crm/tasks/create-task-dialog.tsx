"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { AppDialog } from "@/components/shared/app-dialog";
import { MemberPicker } from "@/components/shared";
import { RecordForm, type RecordFormValues } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { TASK_LAYOUT, taskLayoutWithLinkedEntity } from "@/lib/renderer/crm/task-layout";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateTask,
  useUpdateTask,
  type CreateTaskInput,
  type Task,
  type TaskEntityType,
  type TaskType,
} from "@/hooks/api/tasks";

type CrmEntityType = "LEAD" | "DEAL" | "CONTACT";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  defaultEntityType?: CrmEntityType;
  defaultEntityId?: number;
}

const ENTITY_TYPES: readonly TaskEntityType[] = ["LEAD", "DEAL", "CONTACT"];
const TASK_TYPES: readonly TaskType[] = [
  "CALL",
  "EMAIL",
  "MEETING",
  "DEMO",
  "FOLLOW_UP",
  "REMINDER",
  "CUSTOM",
];

function asEntityType(value: string | undefined): TaskEntityType | undefined {
  return ENTITY_TYPES.find((candidate) => candidate === value);
}

function asTaskType(value: string | undefined): TaskType | undefined {
  return TASK_TYPES.find((candidate) => candidate === value);
}

function asEntityId(value: string | undefined): number | undefined {
  const parsed = Number(value?.trim());
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  task,
  defaultEntityType,
  defaultEntityId,
}: CreateTaskDialogProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const isEditing = !!task;
  const isSubmitting = createTask.isPending || updateTask.isPending;
  const hasPrefilledEntity = !!defaultEntityType && defaultEntityId != null;

  const declared = useMemo(
    () => (hasPrefilledEntity ? taskLayoutWithLinkedEntity() : TASK_LAYOUT),
    [hasPrefilledEntity],
  );
  const layout = useTenantLayout(declared);

  const initial = useMemo(
    () => ({
      title: task?.title ?? "",
      type: task?.type ?? "CUSTOM",
      notes: task?.notes ?? "",
      entityType: task?.entityType ?? defaultEntityType ?? "",
      entityId: task?.entityId ?? defaultEntityId ?? "",
      assigneeId: task?.assigneeId ?? "",
      dueDate: task?.dueDate ?? "",
    }),
    [task, defaultEntityType, defaultEntityId],
  );

  const controls = useMemo(
    () => ({
      assigneeId: ({ value, onChange, disabled }: { value: string; onChange: (next: string) => void; disabled?: boolean }) => (
        <MemberPicker
          mode="single"
          value={value || undefined}
          onChange={(id) => onChange(id ?? "")}
          allowUnassigned
          placeholder="Unassigned"
          disabled={disabled}
        />
      ),
    }),
    [],
  );

  const handleSubmit = useCallback(
    (values: RecordFormValues) => {
      /*
        The linked record is read from the prefill when the form did not offer
        the fields, never from an absent value: hiding a field is a decision to
        stop asking, not a decision to unlink the task.
      */
      const entityType = hasPrefilledEntity
        ? asEntityType(defaultEntityType)
        : asEntityType(values.entityType);
      const entityId = hasPrefilledEntity
        ? defaultEntityId
        : asEntityId(values.entityId);

      const input: CreateTaskInput = {
        title: values.title?.trim() ?? "",
        type: asTaskType(values.type),
        notes: values.notes?.trim() || undefined,
        entityType,
        entityId,
        assigneeId: values.assigneeId?.trim() || undefined,
        dueDate: values.dueDate?.trim() || undefined,
      };

      if (isEditing && task) {
        updateTask.mutate(
          { taskId: task.id, input },
          {
            onSuccess: () => {
              toast.success("Task updated");
              onOpenChange(false);
            },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
        return;
      }

      createTask.mutate(input, {
        onSuccess: () => {
          toast.success("Task created");
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [
      createTask,
      updateTask,
      isEditing,
      task,
      onOpenChange,
      hasPrefilledEntity,
      defaultEntityType,
      defaultEntityId,
    ],
  );

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit task" : "New task"}
    >
      <RecordForm
        key={`${task?.id ?? "new"}:${String(open)}`}
        layout={layout}
        mode={isEditing ? "edit" : "create"}
        initial={initial}
        controls={controls}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? "Save changes" : "Create task"}
      />
    </AppDialog>
  );
}
