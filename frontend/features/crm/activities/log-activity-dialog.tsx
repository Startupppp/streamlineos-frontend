"use client";

import { useCallback, useMemo } from "react";
import { AppDialog } from "@/components/shared/app-dialog";
import { RecordForm, type RecordFormValues } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  activityLayoutWithTypes,
  activityTypeOptions,
} from "@/lib/renderer/crm/activity-layout";
import { useCrmOptions } from "@/hooks/api/crm/metadata";
import type {
  CrmActivityEntityType,
  CrmActivityType,
  LogCrmActivityInput,
} from "@/hooks/api/crm/crm-activities";

const ACTIVITY_TYPES: readonly CrmActivityType[] = ["CALL", "EMAIL", "MEETING", "CUSTOM"];
const ENTITY_TYPES: readonly CrmActivityEntityType[] = ["LEAD", "DEAL", "CONTACT"];

function asActivityType(value: string | undefined): CrmActivityType {
  return ACTIVITY_TYPES.find((candidate) => candidate === value) ?? "CALL";
}

function asEntityType(value: string | undefined): CrmActivityEntityType | undefined {
  return ENTITY_TYPES.find((candidate) => candidate === value);
}

function asEntityId(value: string | undefined): number | undefined {
  const parsed = Number(value?.trim());
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

interface LogActivityDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: LogCrmActivityInput) => void;
  isPending: boolean;
}

export function LogActivityDialog({ open, onClose, onSubmit, isPending }: LogActivityDialogProps) {
  const { data: options } = useCrmOptions("activity_type");

  const types = useMemo(() => activityTypeOptions(options), [options]);

  const description = useMemo(() => activityLayoutWithTypes(types), [types]);
  const layout = useTenantLayout(description);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) onClose();
    },
    [onClose],
  );

  const handleSubmit = useCallback(
    (values: RecordFormValues) => {
      const day = values.dueDate?.trim();
      onSubmit({
        type: asActivityType(values.type),
        title: values.title?.trim() ?? "",
        notes: values.notes?.trim() || undefined,
        entityType: asEntityType(values.entityType),
        entityId: asEntityId(values.entityId),
        dueDate: day ? `${day}T00:00:00.000Z` : undefined,
      });
    },
    [onSubmit],
  );

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Log activity"
      description="Record a call, email, meeting or task."
    >
      <RecordForm
        key={String(open)}
        layout={layout}
        mode="create"
        initial={{ type: types[0]?.value ?? "CALL" }}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSubmitting={isPending}
        submitLabel="Log activity"
      />
    </AppDialog>
  );
}
