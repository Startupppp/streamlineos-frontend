"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Lock, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { CustomFieldUpsertSheet } from "./custom-field-upsert-sheet";
import { useUpdateCustomField, useDeleteCustomField } from "../hooks/use-hr-custom-fields";
import type { HrCustomFieldDefinition, UpdateCustomFieldPayload } from "@/features/hr/forms/lib/types";

interface CustomFieldsDataTableProps {
  entityType: string;
  fields: HrCustomFieldDefinition[];
}

const emptyState = (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <p className="text-sm text-muted-foreground">No custom fields for this entity type yet.</p>
  </div>
);

function getRowKey(row: HrCustomFieldDefinition) {
  return row.id;
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

  function handleSheetOpenChange(open: boolean) {
    if (!open) setEditField(null);
  }

  const columns: DataTableColumn<HrCustomFieldDefinition>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {row.isSensitive && <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: "key",
      header: "Key",
      cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.key}</span>,
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant="secondary" className="text-[11px]">{row.fieldType}</Badge>
      ),
    },
    {
      key: "flags",
      header: "Flags",
      cell: (row) => (
        <div className="flex gap-1.5 flex-wrap">
          {row.isRequired && (
            <Badge variant="outline" className="text-[11px] text-primary border-primary/30">required</Badge>
          )}
          {row.isSensitive && (
            <Badge variant="outline" className="text-[11px] text-amber-700 border-amber-200 gap-0.5">
              <Lock className="h-2.5 w-2.5" /> sensitive
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-20",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="w-7" onClick={() => handleEditClick(row)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 text-destructive" onClick={() => handleDelete(row.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={fields}
        columns={columns}
        getRowKey={getRowKey}
        emptyState={emptyState}
      />

      <CustomFieldUpsertSheet
        open={editField !== null}
        onOpenChange={handleSheetOpenChange}
        entityType={entityType}
        field={editField ?? undefined}
        onSave={handleUpdate}
        isPending={update.isPending}
      />
    </>
  );
}
