"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/shared/app-dialog";
import { RecordForm, type RecordFormValues } from "@/components/renderer";
import { useCustomFields } from "@/hooks/api/crm/custom-fields";
import type { CustomFieldDefinition } from "@/hooks/api/crm/custom-fields";
import { customFieldsLayout, mergeCustomData } from "./custom-fields-form";

interface CustomFieldsEdit {
  canEdit: boolean;
  isPending: boolean;
  /** Receives the whole next `customData`, merged with the keys the form does not own. */
  onSave: (customData: Record<string, unknown>, onDone: () => void) => void;
}

interface CustomFieldsSectionProps {
  entityType: "lead" | "deal" | "contact";
  values: Record<string, unknown>;
  className?: string;
  /** Omitted, the section is read-only. */
  edit?: CustomFieldsEdit;
}

const NO_FIELDS: CustomFieldDefinition[] = [];

export function CustomFieldsSection({ entityType, values, className, edit }: CustomFieldsSectionProps) {
  const { data, isLoading, isError, refetch } = useCustomFields(entityType);
  const fields = data?.fields ?? NO_FIELDS;
  const activeFields = useMemo(() => fields.filter((f) => f.isActive), [fields]);
  const layout = useMemo(() => customFieldsLayout(entityType, activeFields), [entityType, activeFields]);
  const [editOpen, setEditOpen] = useState(false);

  function handleOpenEdit() {
    setEditOpen(true);
  }
  function handleCloseEdit() {
    setEditOpen(false);
  }
  function handleSubmit(formValues: RecordFormValues) {
    edit?.onSave(mergeCustomData(activeFields, values, formValues), handleCloseEdit);
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Failed to load custom fields.</span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (activeFields.length === 0) return null;

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Custom Fields</h3>
        {edit?.canEdit ? (
          <Button type="button" variant="ghost" size="sm" className="gap-1 px-2 text-xs" onClick={handleOpenEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        ) : null}
      </div>
      <div className="space-y-1.5">
        {activeFields.map((field) => (
          <div key={field.id} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
            <span className="text-sm text-muted-foreground">{field.label}</span>
            <span className="text-sm font-medium text-foreground">
              {formatCustomFieldValue(values[field.name], field)}
            </span>
          </div>
        ))}
      </div>
      {edit?.canEdit ? (
        <AppDialog open={editOpen} onOpenChange={setEditOpen} title="Edit custom fields">
          <RecordForm
            key={String(editOpen)}
            layout={layout}
            mode="edit"
            initial={values}
            onSubmit={handleSubmit}
            onCancel={handleCloseEdit}
            isSubmitting={edit.isPending}
            submitLabel="Save changes"
          />
        </AppDialog>
      ) : null}
    </div>
  );
}

function formatCustomFieldValue(value: unknown, field: CustomFieldDefinition): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.fieldType === "boolean") return value ? "Yes" : "No";
  if (field.fieldType === "date" && typeof value === "string") {
    try {
      return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return String(value);
    }
  }
  if (field.fieldType === "select" && typeof value === "string") {
    const option = field.options?.find((o) => o.value === value);
    return option?.label ?? value;
  }
  if (field.fieldType === "number" && typeof value === "number") {
    return value.toLocaleString("en-IN");
  }
  return String(value);
}
