"use client";

import { useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { ErrorState } from "@/components/shared";
import { staggerContainer } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import {
  useCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  type CustomFieldDefinition,
} from "@/hooks/api/crm/custom-fields";
import {
  ENTITY_TABS,
  type EntityType,
  type CreateForm,
  type EditForm,
  createSchema,
  editSchema,
  labelToName,
  FieldRow,
  CreateOptionRow,
  EditOptionRow,
} from "@/features/crm/settings/custom-fields/field-row";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

export default function CustomFieldsPage() {
  const [entityType, setEntityType] = useState<EntityType>("lead");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomFieldDefinition | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const { data, isLoading, isError, refetch } = useCustomFields(entityType);
  const fields = data?.fields ?? [];

  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();
  const deleteField = useDeleteCustomField();

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { label: "", fieldType: "text", isRequired: false, options: [] },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { label: "", isRequired: false, options: [] },
  });

  const { fields: createOptions, append: appendCreateOption, remove: removeCreateOption } = useFieldArray({
    control: createForm.control,
    name: "options",
  });

  const { fields: editOptions, append: appendEditOption, remove: removeEditOption } = useFieldArray({
    control: editForm.control,
    name: "options",
  });

  const createFieldType = createForm.watch("fieldType");

  const handleEntityTab = useCallback((type: EntityType) => setEntityType(type), []);

  const handleOpenCreate = useCallback(() => {
    createForm.reset({ label: "", fieldType: "text", isRequired: false, options: [] });
    setCreateOpen(true);
  }, [createForm]);

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      setCreateOpen(open);
      if (!open) createForm.reset({ label: "", fieldType: "text", isRequired: false, options: [] });
    },
    [createForm],
  );

  const handleStartEdit = useCallback(
    (field: CustomFieldDefinition) => {
      setEditTarget(field);
      editForm.reset({ label: field.label, isRequired: field.isRequired, options: field.options ?? [] });
    },
    [editForm],
  );

  const handleEditDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setEditTarget(null);
  }, []);

  const handleDeleteRequest = useCallback((id: number) => setDeleteTargetId(id), []);
  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) setDeleteTargetId(null); }, []);

  const handleToggleActive = useCallback(
    (id: number, et: EntityType, currentActive: boolean) => {
      updateField.mutate(
        { id, entityType: et, isActive: !currentActive },
        {
          onSuccess: () => toast.success("Field updated"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [updateField],
  );

  const onCreateSubmit = useCallback(
    (formData: CreateForm) => {
      createField.mutate(
        {
          entityType,
          name: labelToName(formData.label),
          label: formData.label,
          fieldType: formData.fieldType,
          isRequired: formData.isRequired,
          options: formData.fieldType === "select" ? (formData.options ?? []) : undefined,
          sortOrder: fields.length,
        },
        {
          onSuccess: () => {
            toast.success("Custom field created");
            setCreateOpen(false);
            createForm.reset({ label: "", fieldType: "text", isRequired: false, options: [] });
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createField, createForm, entityType, fields.length],
  );

  const onEditSubmit = useCallback(
    (formData: EditForm) => {
      if (!editTarget) return;
      updateField.mutate(
        {
          id: editTarget.id,
          entityType: editTarget.entityType,
          label: formData.label,
          isRequired: formData.isRequired,
          options: editTarget.fieldType === "select" ? (formData.options ?? null) : null,
        },
        {
          onSuccess: () => { toast.success("Field updated"); setEditTarget(null); },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [editTarget, updateField],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteField.mutate(
      { id: deleteTargetId, entityType },
      {
        onSuccess: () => { toast.success("Field deleted"); setDeleteTargetId(null); },
        onError: (err) => { toast.error(getErrorMessage(err)); setDeleteTargetId(null); },
      },
    );
  }, [deleteField, deleteTargetId, entityType]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleAddCreateOption = useCallback(() => appendCreateOption({ value: "", label: "" }), [appendCreateOption]);
  const handleAddEditOption = useCallback(() => appendEditOption({ value: "", label: "" }), [appendEditOption]);

  const entityLabel = ENTITY_TABS.find((t) => t.value === entityType)?.label ?? entityType;
  const containerVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : staggerContainer;

  if (isLoading) {
    return (
      <PageWrapper title="Custom Fields" subtitle="Loading...">
        <div className="space-y-6">
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-20" />)}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Custom Fields" subtitle="Define additional fields for your CRM entities">
        <ErrorState title="Failed to load custom fields" onRetry={handleRetry} />
      </PageWrapper>
    );
  }

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
            <AlertDialogDescription>
              This field will be permanently deleted and all associated data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editTarget} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Custom Field</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Lead Source" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="isRequired"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="!mt-0">Required field</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              {editTarget?.fieldType === "select" && (
                <div className="space-y-2">
                  <FormLabel>Options</FormLabel>
                  {editOptions.map((opt, i) => (
                    <EditOptionRow key={opt.id} index={i} control={editForm.control} onRemove={removeEditOption} />
                  ))}
                  <Button type="button" variant="outline" size="sm" className="text-xs" onClick={handleAddEditOption}>
                    <Plus className="h-3 w-3 mr-1" /> Add Option
                  </Button>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={updateField.isPending}>
                {updateField.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Lead Source" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="fieldType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="boolean">Yes / No</SelectItem>
                        <SelectItem value="select">Select (dropdown)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="isRequired"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="!mt-0">Required field</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              {createFieldType === "select" && (
                <div className="space-y-2">
                  <FormLabel>Options</FormLabel>
                  {createOptions.map((opt, i) => (
                    <CreateOptionRow key={opt.id} index={i} control={createForm.control} onRemove={removeCreateOption} />
                  ))}
                  <Button type="button" variant="outline" size="sm" className="text-xs" onClick={handleAddCreateOption}>
                    <Plus className="h-3 w-3 mr-1" /> Add Option
                  </Button>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={createField.isPending}>
                {createField.isPending ? "Creating..." : "Create Field"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <PageWrapper
        title="Custom Fields"
        subtitle={`${fields.length} field${fields.length !== 1 ? "s" : ""} for ${entityLabel}`}
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        }
      >
        <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
            {ENTITY_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleEntityTab(tab.value)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150",
                  entityType === tab.value
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <motion.div className="space-y-2" variants={containerVariants} initial="hidden" animate="visible">
            {fields.length > 0 ? (
              fields.map((f) => (
                <FieldRow
                  key={f.id}
                  field={f}
                  onEdit={handleStartEdit}
                  onDeleteRequest={handleDeleteRequest}
                  onToggle={handleToggleActive}
                />
              ))
            ) : (
              <EmptyState
                illustration={<EmptyDocumentsIllustration />}
                className={CONTENT_FILL_PANEL}
                title={`No custom fields for ${entityLabel} yet`}
                description="Add your first field to capture additional data for this entity type."
                action={{ label: "Add Field", onClick: handleOpenCreate }}
              />
            )}
          </motion.div>
        </motion.div>
      </PageWrapper>
    </>
  );
}
