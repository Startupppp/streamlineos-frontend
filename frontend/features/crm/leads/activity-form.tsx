"use client";

import { RecordForm, type RecordFormValues } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { LEAD_ACTIVITY_LAYOUT } from "@/lib/renderer/crm/lead-activity-layout";

export interface ActivityFormValues {
  activityType: string;
  subject?: string;
  duration?: number;
  outcome?: string;
  activityNotes?: string;
  location?: string;
}

interface ActivityFormProps {
  onSubmit: (values: ActivityFormValues) => void;
  isPending: boolean;
}

export function ActivityForm({ onSubmit, isPending }: ActivityFormProps) {
  const layout = useTenantLayout(LEAD_ACTIVITY_LAYOUT);

  function handleSubmit(values: RecordFormValues) {
    const minutes = Number(values.duration);
    onSubmit({
      activityType: values.activityType ?? "call",
      subject: values.subject?.trim() || undefined,
      duration: Number.isFinite(minutes) && values.duration ? minutes : undefined,
      outcome: values.outcome?.trim() || undefined,
      activityNotes: values.activityNotes?.trim() || undefined,
      location: values.location?.trim() || undefined,
    });
  }

  return (
    <RecordForm
      layout={layout}
      mode="create"
      initial={{ activityType: "call" }}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel="Log interaction"
    />
  );
}
