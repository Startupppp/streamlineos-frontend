"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { RecordForm, type RecordFormValues } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { withFormFields } from "@/lib/renderer/layout-adjustment";
import { LEAD_ACTIVITY_LAYOUT } from "@/lib/renderer/crm/lead-activity-layout";
import { TASK_LAYOUT } from "@/lib/renderer/crm/task-layout";
import { getErrorMessage } from "@/lib/get-error-message";
import { useLogLeadActivity } from "@/hooks/api/leads";
import { useCreateTask } from "@/hooks/api/tasks";

/**
 * The lead page's quick composers, rendered from the descriptions.
 *
 * Each one is the record type it writes to, narrowed to the fields this button
 * asks for. Everything else the write needs is supplied by where the composer
 * sits rather than by a control: the activity's type is the button that was
 * pressed, the task's link is the lead whose page this is, and the date is now.
 * That is what `withFormFields` is for — the alternative is a hand-written
 * panel with its own schema beside the record type it is writing to, which is
 * how these four came to hold a fourth copy of what a note is.
 *
 * `useTenantLayout` runs first and the narrowing second, so a composer can only
 * narrow what the tenant already sees: a field they hid does not come back
 * through a quick action.
 *
 * The note composer is the one that tightens. An interaction allows an empty
 * note — a call logged with no notes is still a call, which is why the call
 * composer below tightens nothing — but a box whose whole job is "add a note"
 * with nothing in it is not a note. That is the composer's knowledge rather
 * than the record type's, so it is framing here and not `required` on the
 * shared description.
 *
 * Closing resets, because the panel is unmounted when it closes. There is no
 * `reset()` call here and no form state above this file to hold on to.
 */

const PANEL_CLASS = "rounded-lg border border-border/30 bg-muted/20 p-4";

const NOTE_FIELDS = ["activityNotes"];
const CALL_FIELDS = ["subject", "duration", "outcome", "activityNotes"];
const TASK_FIELDS = ["title", "dueDate"];

interface LeadComposerProps {
  leadId: number;
  onDone: () => void;
}

/** A control hands back local wall-clock text; the API stores an instant. */
function toInstant(value: string | undefined): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  const at = new Date(text);
  return Number.isNaN(at.getTime()) ? undefined : at.toISOString();
}

function toMinutes(value: string | undefined): number | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  const minutes = Number(text);
  return Number.isFinite(minutes) ? minutes : undefined;
}

export function LeadNotePanel({ leadId, onDone }: LeadComposerProps) {
  const tenantLayout = useTenantLayout(LEAD_ACTIVITY_LAYOUT);
  const layout = useMemo(
    () => withFormFields(tenantLayout, NOTE_FIELDS, { required: NOTE_FIELDS }),
    [tenantLayout],
  );
  const logActivity = useLogLeadActivity();

  const handleSubmit = useCallback(
    (values: RecordFormValues) => {
      logActivity.mutate(
        {
          leadId,
          type: "note",
          date: new Date().toISOString(),
          notes: values.activityNotes?.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Note added");
            onDone();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [leadId, logActivity, onDone],
  );

  return (
    <div className={PANEL_CLASS}>
      <RecordForm
        layout={layout}
        mode="create"
        onSubmit={handleSubmit}
        onCancel={onDone}
        isSubmitting={logActivity.isPending}
        submitLabel="Save Note"
      />
    </div>
  );
}

export function LeadCallPanel({ leadId, onDone }: LeadComposerProps) {
  const tenantLayout = useTenantLayout(LEAD_ACTIVITY_LAYOUT);
  const layout = useMemo(() => withFormFields(tenantLayout, CALL_FIELDS), [tenantLayout]);
  const logActivity = useLogLeadActivity();

  const handleSubmit = useCallback(
    (values: RecordFormValues) => {
      logActivity.mutate(
        {
          leadId,
          type: "call",
          date: new Date().toISOString(),
          subject: values.subject?.trim() || undefined,
          duration: toMinutes(values.duration),
          outcome: values.outcome?.trim() || undefined,
          notes: values.activityNotes?.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Call logged");
            onDone();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [leadId, logActivity, onDone],
  );

  return (
    <div className={PANEL_CLASS}>
      <RecordForm
        layout={layout}
        mode="create"
        onSubmit={handleSubmit}
        onCancel={onDone}
        isSubmitting={logActivity.isPending}
        submitLabel="Log Call"
      />
    </div>
  );
}

export function LeadTaskPanel({ leadId, onDone }: LeadComposerProps) {
  const tenantLayout = useTenantLayout(TASK_LAYOUT);
  const layout = useMemo(() => withFormFields(tenantLayout, TASK_FIELDS), [tenantLayout]);
  const createTask = useCreateTask();

  const handleSubmit = useCallback(
    (values: RecordFormValues) => {
      createTask.mutate(
        {
          title: values.title?.trim() ?? "",
          type: "CUSTOM",
          entityType: "LEAD",
          entityId: leadId,
          dueDate: toInstant(values.dueDate),
        },
        {
          onSuccess: () => {
            toast.success("Task created");
            onDone();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [leadId, createTask, onDone],
  );

  return (
    <div className={PANEL_CLASS}>
      <RecordForm
        layout={layout}
        mode="create"
        onSubmit={handleSubmit}
        onCancel={onDone}
        isSubmitting={createTask.isPending}
        submitLabel="Create Task"
      />
    </div>
  );
}
