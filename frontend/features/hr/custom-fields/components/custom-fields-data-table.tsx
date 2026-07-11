"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { CustomFieldUpsertDialog } from "./custom-field-upsert-dialog";
import { useUpdateCustomField, useDeleteCustomField } from "../hooks/use-hr-custom-fields";
import type { HrCustomFieldDefinition, UpdateCustomFieldPayload } from "@/features/hr/forms/lib/types";

interface CustomFieldsDataTableProps {
  entityType: string;
  fields: HrCustomFieldDefinition[];
}

export function CustomFieldsDataTable({ entityType, fields }: CustomFieldsDataTableProps) {
  const [editField, setEditField] = useState<HrCustomFieldDefinition | null>(null);
  const update = useUpdateCustomField(entityType);
  const del = useDeleteCustomField(entityType);

  async function handleUpdate(payload: UpdateCustomFieldPayload) {
    if (!editField) return;
    try {
      await update.mutateAsync({ id: editField.id, payload });
      toast.success("Field updated");
      setEditField(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete(id: number) {
    try {
      await del.mutateAsync(id);
      toast.success("Field deactivated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleEditClick(field: HrCustomFieldDefinition) {
    setEditField(field);
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) setEditField(null);
  }

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">No custom fields for this entity type yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Key</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Flags</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.map((field) => (
              <tr key={field.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{field.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{field.key}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className="text-[11px]">{field.fieldType}</Badge>
                </td>
                <td className="px-4 py-3 flex gap-1.5 flex-wrap">
                  {field.isRequired && (
                    <Badge variant="outline" className="text-[11px] text-blue-700 border-blue-200">required</Badge>
                  )}
                  {field.isSensitive && (
                    <Badge variant="outline" className="text-[11px] text-amber-700 border-amber-200">sensitive</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(field)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(field.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CustomFieldUpsertDialog
        open={editField !== null}
        onOpenChange={handleDialogOpenChange}
        entityType={entityType}
        field={editField ?? undefined}
        onSave={handleUpdate}
        isPending={update.isPending}
      />
    </>
  );
}
