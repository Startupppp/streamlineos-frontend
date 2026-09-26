"use client";

import { memo, useEffect, useState, useCallback, useMemo } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customFieldSchema, type CustomFieldFormValues } from "./custom-fields-schema";
import {
  useProjectCustomFields,
  useCreateProjectCustomField,
  useUpdateProjectCustomField,
  useDeleteProjectCustomField,
} from "@/hooks/api/build/custom-fields";
import { useCan, useCanState } from "@/hooks/api/access";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { Trash2Icon, PlusIcon } from "@animateicons/react/lucide";
import { Pencil } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CustomFieldType } from "@/types/projects/tasks";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/lib/text-overflow";

const FIELD_TYPES: Array<{ value: CustomFieldType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "multi_select", label: "Multi-select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
  { value: "currency", label: "Currency" },
  { value: "user", label: "User" },
];

const fieldTypeColors: Record<CustomFieldType, string> = {
  text: "bg-muted text-muted-foreground",
  number: "bg-category-blue-surface text-category-blue-ink",
  date: "bg-category-amber-surface text-category-amber-ink",
  user: "bg-category-indigo-surface text-category-indigo-ink",
  select: "bg-category-emerald-surface text-category-emerald-ink",
  multi_select: "bg-category-teal-surface text-category-teal-ink",
  checkbox: "bg-category-pink-surface text-category-pink-ink",
  url: "bg-category-sky-surface text-category-sky-ink",
  currency: "bg-category-green-surface text-category-green-ink",
};

export interface CustomFieldItem {
  id: number;
  name: string;
  type: CustomFieldType;
  options?: string[] | null;
  required?: boolean;
}

interface CustomFieldRowProps {
  field: CustomFieldItem;
  index: number;
  onDelete: (fieldId: number) => void;
  onEdit: (field: CustomFieldItem) => void;
  canManage: boolean;
}

const CustomFieldRow = memo(function CustomFieldRow({
  field,
  index,
  onDelete,
  onEdit,
  canManage,
}: CustomFieldRowProps) {
  const handleDelete = useCallback(() => onDelete(field.id), [field.id, onDelete]);
  const handleEdit = useCallback(() => onEdit(field), [field, onEdit]);
  const { iconRef: deleteIconRef, hoverHandlers: deleteHoverHandlers } = useAnimatedIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {field.name}
        </p>
        {field.options && field.options.length > 0 && (
          <p className="text-dense text-muted-foreground truncate mt-0.5">
            Options: {field.options.join(", ")}
          </p>
        )}
      </div>
      <Badge
        variant="secondary"
        className={`text-micro shrink-0 ${fieldTypeColors[field.type]}`}
      >
        {field.type.replace("_", " ")}
      </Badge>
      {field.required && (
        <Badge
          variant="outline"
          className="text-micro shrink-0 border-status-danger-rule text-status-danger-ink-strong"
        >
          required
        </Badge>
      )}
      {canManage ? (
        <>
          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            aria-label={`Edit field ${field.name}`}
            onClick={handleEdit}
          >
            <Pencil size={14} />
          </button>
          <ConfirmDialog
            trigger={
              <button
                type="button"
                className="w-7 flex items-center justify-center rounded-lg text-status-danger-ink hover:text-status-danger-ink hover:bg-status-danger-surface transition-colors shrink-0"
                aria-label="Delete field"
                {...deleteHoverHandlers}
              >
                <Trash2Icon ref={deleteIconRef} size={14} />
              </button>
            }
            title="Delete custom field?"
            description="This will remove the field and all its values from all tickets. This cannot be undone."
            confirmLabel="Delete"
            destructive
            onConfirm={handleDelete}
          />
        </>
      ) : null}
    </motion.div>
  );
});

interface CustomFieldFormFieldsProps {
  form: ReturnType<typeof useForm<CustomFieldFormValues>>;
}

function CustomFieldFormFields({ form }: CustomFieldFormFieldsProps) {
  const currentFieldType = form.watch("fieldType");

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="fieldName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Field Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Story Points" className="text-sm" autoFocus />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fieldType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
      </div>
      {(currentFieldType === "select" || currentFieldType === "multi_select") && (
        <FormField
          control={form.control}
          name="options"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Options (comma-separated)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Option 1, Option 2, Option 3" className="text-sm" />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
      )}
    </>
  );
}

interface CustomFieldsSettingsProps {
  projectId: number;
  search?: string;
  createRef?: React.RefObject<(() => void) | null>;
  editRef?: React.RefObject<((field: CustomFieldItem) => void) | null>;
}

export function CustomFieldsSettings({ projectId, search, createRef, editRef }: CustomFieldsSettingsProps) {
  const accessState = useCanState("build:view");
  const canManage = useCan("build:manage");
  const [showForm, setShowForm] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldItem | null>(null);

  const {
    data: fields = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectCustomFields(projectId);
  const createField = useCreateProjectCustomField(projectId);
  const updateField = useUpdateProjectCustomField(projectId);
  const deleteField = useDeleteProjectCustomField(projectId);

  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: { fieldName: "", fieldType: "text", options: "" },
  });
  useRegisterDirtyState(showForm && form.formState.isDirty);

  const currentFieldType = form.watch("fieldType");

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    form.reset();
  }, [form]);

  const handleCreate = useCallback((values: CustomFieldFormValues) => {
    const parsedOptions =
      (values.fieldType === "select" || values.fieldType === "multi_select") && values.options.trim()
        ? values.options.split(",").map((s) => s.trim()).filter(Boolean)
        : null;

    createField.mutate(
      { name: values.fieldName.trim(), type: values.fieldType, options: parsedOptions },
      {
        onSuccess: () => {
          form.reset();
          setShowForm(false);
          toast.success("Custom field created");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [createField, form]);

  const handleDelete = useCallback(
    (fieldId: number) => {
      deleteField.mutate(fieldId, {
        onSuccess: () => toast.success("Field deleted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteField],
  );

  const handleOpenEdit = useCallback((field: CustomFieldItem) => {
    setEditingField(field);
  }, []);

  const handleCloseEdit = useCallback((open: boolean) => {
    if (!open) setEditingField(null);
  }, []);

  const handleUpdate = useCallback((values: CustomFieldFormValues) => {
    if (!editingField) return;
    const parsedOptions =
      (values.fieldType === "select" || values.fieldType === "multi_select") && values.options.trim()
        ? values.options.split(",").map((s) => s.trim()).filter(Boolean)
        : null;

    updateField.mutate(
      {
        fieldId: editingField.id,
        data: {
          name: values.fieldName.trim(),
          type: values.fieldType,
          options: parsedOptions,
        },
      },
      {
        onSuccess: () => {
          setEditingField(null);
          toast.success("Custom field updated");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [editingField, updateField]);

  const editDefaultValues = useMemo<CustomFieldFormValues>(
    () => ({
      fieldName: editingField?.name ?? "",
      fieldType: editingField?.type ?? "text",
      options: editingField?.options?.join(", ") ?? "",
    }),
    [editingField],
  );

  const handleShowForm = useCallback(() => setShowForm(true), []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (createRef) createRef.current = handleShowForm;
  }, [createRef, handleShowForm]);

  useEffect(() => {
    if (editRef) editRef.current = handleOpenEdit;
  }, [editRef, handleOpenEdit]);

  const filteredFields = search
    ? fields.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : fields;

  if (accessState === "denied" || accessState === "loading") return null;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>
            Custom Fields
          </h3>
          <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
            Define additional data fields for tickets in this project.
          </p>
        </div>
        {canManage && !showForm ? (
          <AnimatedIconButton
            variant="outline"
            size="sm"
            onClick={handleShowForm}
            className="h-7 shrink-0 text-xs gap-1.5"
            icon={PlusIcon}
            iconSize={14}
          >
            Add Custom Field
          </AnimatedIconButton>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          compact
          title="Couldn't load custom fields"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filteredFields.length === 0 && fields.length === 0 && !showForm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <EmptyState
                  compact
                  illustrationPreset="settings"
                  title="No custom fields yet"
                  description="Add fields to capture additional ticket data."
                  action={canManage ? { label: "Add Custom Field", onClick: handleShowForm } : undefined}
                />
              </motion.div>
            )}

            {filteredFields.length === 0 && fields.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <EmptyState
                  compact
                  illustrationPreset="settings"
                  title="No fields match your search"
                  description="Try a different search term."
                />
              </motion.div>
            )}

            {filteredFields.map((field, idx) => (
              <CustomFieldRow
                key={field.id}
                field={field}
                index={idx}
                onDelete={handleDelete}
                onEdit={handleOpenEdit}
                canManage={canManage}
              />
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {canManage && showForm && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleCreate)}
                    className="p-4 rounded-lg border border-border bg-muted/30 space-y-3"
                  >
                    <CustomFieldFormFields form={form} />
                    <div className="flex gap-2">
                      <LoadingButton type="submit" size="sm" isPending={createField.isPending} loadingText="Creating…" className="text-xs">
                        Create Field
                      </LoadingButton>
                      <Button type="button" size="sm" variant="ghost" onClick={handleCancelForm} className="text-xs">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {canManage && (
        <EntityFormDialog<CustomFieldFormValues>
          open={!!editingField}
          onOpenChange={handleCloseEdit}
          title="Edit custom field"
          resolver={zodResolver(customFieldSchema)}
          defaultValues={editDefaultValues}
          onSubmit={handleUpdate}
          isSubmitting={updateField.isPending}
          submitLabel="Save changes"
          resetOnOpen
        >
          {(form) => <CustomFieldFormFields form={form} />}
        </EntityFormDialog>
      )}
    </div>
  );
}
