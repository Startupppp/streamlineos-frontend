"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { CUSTOM_FIELD_TYPES } from "@/types/projects/tasks";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/lib/text-overflow";
import { CustomFieldRow } from "./custom-field-row";
import type { CustomFieldItem } from "./custom-field-row";
import { CustomFieldFormFields } from "./custom-field-form-fields";

interface CustomFieldsSettingsProps {
  projectId: number;
  search?: string;
  createRef?: React.RefObject<(() => void) | null>;
  editRef?: React.RefObject<((field: CustomFieldItem) => void) | null>;
}

export function CustomFieldsSettings({ projectId, search, createRef, editRef }: CustomFieldsSettingsProps) {
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

  const resolution = usePageState({ permission: "build:view", isLoading, isError, error });
  const createField = useCreateProjectCustomField(projectId);
  const updateField = useUpdateProjectCustomField(projectId);
  const deleteField = useDeleteProjectCustomField(projectId);

  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: { fieldName: "", fieldType: "text", options: "" },
  });
  useRegisterDirtyState(showForm && form.formState.isDirty);

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
      fieldType: CUSTOM_FIELD_TYPES.find((t) => t === editingField?.type) ?? "text",
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

  const loadingSkeleton = (
    <div className="space-y-2">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );

  return (
    <PageState resolution={resolution} loading={loadingSkeleton} onRetry={handleRetry} compact>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="min-w-0">
            <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>
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

        {canManage && (
          <EntityFormDialog<CustomFieldFormValues>
            open={!!editingField}
            onOpenChange={handleCloseEdit}
            title="Edit custom field"
            description="Update the field name, type, and available options."
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
    </PageState>
  );
}
