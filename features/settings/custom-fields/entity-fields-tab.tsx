"use client";

import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { Card, CardContent } from "@/components/ui/card";
import { GripVertical, Plus, Trash2, Pencil } from "lucide-react";
import {
  useCustomFields,
  useDeleteCustomField,
  useUpdateCustomField,
  type CustomFieldDefinition,
} from "@/lib/api/hooks/crm";
import { toast } from "sonner";
import { type EntityType, FIELD_TYPE_LABELS } from "./types";
import { FieldSheet } from "./field-sheet";

interface EntityFieldsTabProps {
  entityType: EntityType;
}

export const EntityFieldsTab = memo(function EntityFieldsTab({
  entityType,
}: EntityFieldsTabProps) {
  const { data, isLoading } = useCustomFields(entityType);
  const deleteField = useDeleteCustomField();
  const updateField = useUpdateCustomField();
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  const fields = data?.fields ?? [];

  const openCreate = useCallback(() => {
    setEditingField(null);
    setIsCreateMode(true);
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((field: CustomFieldDefinition) => {
    setEditingField(field);
    setIsCreateMode(false);
    setSheetOpen(true);
  }, []);

  const handleToggleActive = useCallback(
    async (field: CustomFieldDefinition) => {
      try {
        await updateField.mutateAsync({
          id: field.id,
          entityType,
          isActive: !field.isActive,
        });
        toast.success(`Field ${field.isActive ? "deactivated" : "activated"}`);
      } catch {
        toast.error("Failed to update field");
      }
    },
    [updateField, entityType]
  );

  const handleDelete = useCallback(
    async (field: CustomFieldDefinition) => {
      try {
        await deleteField.mutateAsync({ id: field.id, entityType });
        toast.success("Field deleted");
      } catch {
        toast.error("Failed to delete field");
      }
    },
    [deleteField, entityType]
  );

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <EmptyState
          illustration={<EmptyTargetIllustration className="h-24 w-24" />}
          title="No custom fields yet"
          description={`Add custom fields to capture additional information on ${entityType}s.`}
          compact
          action={{ label: "Add Field", onClick: openCreate }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  onEdit={openEdit}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <FieldSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        entityType={entityType}
        editingField={editingField}
        isCreate={isCreateMode}
      />
    </div>
  );
});


interface FieldRowProps {
  field: CustomFieldDefinition;
  onEdit: (field: CustomFieldDefinition) => void;
  onToggleActive: (field: CustomFieldDefinition) => void;
  onDelete: (field: CustomFieldDefinition) => void;
}

const FieldRow = memo(function FieldRow({
  field,
  onEdit,
  onToggleActive,
  onDelete,
}: FieldRowProps) {
  const handleEdit = useCallback(() => onEdit(field), [onEdit, field]);
  const handleToggle = useCallback(() => onToggleActive(field), [onToggleActive, field]);
  const handleDelete = useCallback(() => onDelete(field), [onDelete, field]);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <GripVertical
        className="h-4 w-4 text-muted-foreground/40 shrink-0"
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{field.label}</span>
          <Badge variant="outline" className="text-xs font-mono">
            {field.name}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {FIELD_TYPE_LABELS[field.fieldType]}
          </Badge>
          {field.isRequired && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Switch
          checked={field.isActive}
          onCheckedChange={handleToggle}
          aria-label={`Toggle ${field.label} active`}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleEdit}
          aria-label={`Edit ${field.label}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              aria-label={`Delete ${field.label}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the field &quot;{field.label}&quot;? This will
                not remove existing data stored under this field, but the field will no longer
                appear in forms.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
});
