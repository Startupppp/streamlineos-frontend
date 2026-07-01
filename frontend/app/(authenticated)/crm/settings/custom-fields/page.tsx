"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Pencil, Sliders, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
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
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  type CustomFieldDefinition,
} from "@/hooks/api/crm/activities";
import { toast } from "sonner";

type EntityType = "lead" | "deal" | "contact";

const ENTITY_TABS = [
  { value: "lead" as EntityType, label: "Leads" },
  { value: "contact" as EntityType, label: "Contacts" },
  { value: "deal" as EntityType, label: "Deals" },
];

const FIELD_TYPE_CONFIG: Record<
  CustomFieldDefinition["fieldType"],
  { label: string; className: string }
> = {
  text: { label: "Text", className: "bg-slate-100 text-slate-700" },
  number: { label: "Number", className: "bg-blue-50 text-blue-700" },
  date: { label: "Date", className: "bg-amber-50 text-amber-700" },
  boolean: { label: "Yes/No", className: "bg-emerald-50 text-emerald-700" },
  select: { label: "Select", className: "bg-purple-50 text-purple-700" },
};

const optionSchema = z.object({
  value: z.string().min(1, "Value required"),
  label: z.string().min(1, "Label required"),
});

const createSchema = z.object({
  label: z.string().min(1, "Label is required").max(100),
  fieldType: z.enum(["text", "number", "date", "boolean", "select"]),
  isRequired: z.boolean(),
  options: z.array(optionSchema).optional(),
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  label: z.string().min(1, "Label is required").max(100),
  isRequired: z.boolean(),
  options: z.array(optionSchema).optional(),
});
type EditForm = z.infer<typeof editSchema>;

function labelToName(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

interface FieldRowProps {
  field: CustomFieldDefinition;
  onEdit: (f: CustomFieldDefinition) => void;
  onDeleteRequest: (id: number) => void;
  onToggle: (id: number, entityType: EntityType, currentActive: boolean) => void;
}

function FieldRow({ field, onEdit, onDeleteRequest, onToggle }: FieldRowProps) {
  const handleEdit = useCallback(() => onEdit(field), [field, onEdit]);
  const handleDelete = useCallback(
    () => onDeleteRequest(field.id),
    [field.id, onDeleteRequest],
  );
  const handleToggle = useCallback(
    () => onToggle(field.id, field.entityType, field.isActive),
    [field.id, field.entityType, field.isActive, onToggle],
  );

  const typeConfig = FIELD_TYPE_CONFIG[field.fieldType];

  return (
    <motion.div variants={fadeUp}>
      <Card className={cn("bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm transition-all", !field.isActive && "opacity-60")}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate">{field.label}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {field.name}
                </span>
                <Badge
                  className={cn(
                    "text-[10px] border-0 px-1.5 py-0.5",
                    typeConfig.className,
                  )}
                >
                  {typeConfig.label}
                </Badge>
                {field.isRequired && (
                  <Badge variant="outline" className="text-[10px]">
                    Required
                  </Badge>
                )}
                {field.fieldType === "select" && field.options && field.options.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {field.options.length} options
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={field.isActive}
                onCheckedChange={handleToggle}
                aria-label={`Toggle ${field.label}`}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleEdit}
                aria-label={`Edit ${field.label}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={handleDelete}
                aria-label={`Delete ${field.label}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface CreateOptionRowProps {
  index: number;
  control: Control<CreateForm>;
  onRemove: (i: number) => void;
}

function CreateOptionRow({ index, control, onRemove }: CreateOptionRowProps) {
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);
  return (
    <div className="flex items-center gap-2">
      <FormField
        control={control}
        name={`options.${index}.label`}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormControl>
              <Input {...field} className="h-8 text-xs" placeholder="Label" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`options.${index}.value`}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormControl>
              <Input {...field} className="h-8 text-xs" placeholder="Value" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive shrink-0"
        onClick={handleRemove}
        aria-label="Remove option"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface EditOptionRowProps {
  index: number;
  control: Control<EditForm>;
  onRemove: (i: number) => void;
}

function EditOptionRow({ index, control, onRemove }: EditOptionRowProps) {
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);
  return (
    <div className="flex items-center gap-2">
      <FormField
        control={control}
        name={`options.${index}.label`}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormControl>
              <Input {...field} className="h-8 text-xs" placeholder="Label" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`options.${index}.value`}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormControl>
              <Input {...field} className="h-8 text-xs" placeholder="Value" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive shrink-0"
        onClick={handleRemove}
        aria-label="Remove option"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function CustomFieldsPage() {
  const [entityType, setEntityType] = useState<EntityType>("lead");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomFieldDefinition | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

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

  const {
    fields: createOptions,
    append: appendCreateOption,
    remove: removeCreateOption,
  } = useFieldArray({ control: createForm.control, name: "options" });

  const {
    fields: editOptions,
    append: appendEditOption,
    remove: removeEditOption,
  } = useFieldArray({ control: editForm.control, name: "options" });

  const createFieldType = createForm.watch("fieldType");

  const handleEntityTab = useCallback((type: EntityType) => {
    setEntityType(type);
  }, []);

  const handleOpenCreate = useCallback(() => {
    createForm.reset({ label: "", fieldType: "text", isRequired: false, options: [] });
    setCreateOpen(true);
  }, [createForm]);

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      setCreateOpen(open);
      if (!open) {
        createForm.reset({ label: "", fieldType: "text", isRequired: false, options: [] });
      }
    },
    [createForm],
  );

  const handleStartEdit = useCallback(
    (field: CustomFieldDefinition) => {
      setEditTarget(field);
      editForm.reset({
        label: field.label,
        isRequired: field.isRequired,
        options: field.options ?? [],
      });
    },
    [editForm],
  );

  const handleEditClose = useCallback(() => {
    setEditTarget(null);
  }, []);

  const handleEditDialogOpenChange = useCallback((open: boolean) => {
    if (!open) handleEditClose();
  }, [handleEditClose]);

  const handleDeleteRequest = useCallback((id: number) => {
    setDeleteTargetId(id);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setDeleteTargetId(null);
  }, []);

  const handleAlertOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handleDeleteCancel();
    },
    [handleDeleteCancel],
  );

  const handleToggleActive = useCallback(
    (id: number, et: EntityType, currentActive: boolean) => {
      updateField.mutate(
        { id, entityType: et, isActive: !currentActive },
        {
          onSuccess: () => toast.success("Field updated"),
          onError: (err) => toast.error(err.message),
        },
      );
    },
    [updateField],
  );

  const onCreateSubmit = useCallback(
    (data: CreateForm) => {
      createField.mutate(
        {
          entityType,
          name: labelToName(data.label),
          label: data.label,
          fieldType: data.fieldType,
          isRequired: data.isRequired,
          options: data.fieldType === "select" ? (data.options ?? []) : undefined,
          sortOrder: fields.length,
        },
        {
          onSuccess: () => {
            toast.success("Custom field created");
            setCreateOpen(false);
            createForm.reset({ label: "", fieldType: "text", isRequired: false, options: [] });
          },
          onError: (err) => toast.error(err.message),
        },
      );
    },
    [createField, createForm, entityType, fields.length],
  );

  const onEditSubmit = useCallback(
    (data: EditForm) => {
      if (!editTarget) return;
      updateField.mutate(
        {
          id: editTarget.id,
          entityType: editTarget.entityType,
          label: data.label,
          isRequired: data.isRequired,
          options:
            editTarget.fieldType === "select" ? (data.options ?? null) : null,
        },
        {
          onSuccess: () => {
            toast.success("Field updated");
            setEditTarget(null);
          },
          onError: (err) => toast.error(err.message),
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
        onSuccess: () => {
          toast.success("Field deleted");
          setDeleteTargetId(null);
        },
        onError: (err) => {
          toast.error(err.message);
          setDeleteTargetId(null);
        },
      },
    );
  }, [deleteField, deleteTargetId, entityType]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleAddCreateOption = useCallback(() => {
    appendCreateOption({ value: "", label: "" });
  }, [appendCreateOption]);

  const handleAddEditOption = useCallback(() => {
    appendEditOption({ value: "", label: "" });
  }, [appendEditOption]);

  const entityLabel = ENTITY_TABS.find((t) => t.value === entityType)?.label ?? entityType;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          illustration={<Sliders className="h-10 w-10 text-muted-foreground" />}
          title="Failed to load custom fields"
          description="Something went wrong. Please try again."
          action={{ label: "Retry", onClick: handleRetry }}
        />
      </div>
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
                    <FormControl>
                      <Input {...field} placeholder="e.g. Lead Source" />
                    </FormControl>
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
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Required field</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {editTarget?.fieldType === "select" && (
                <div className="space-y-2">
                  <FormLabel>Options</FormLabel>
                  {editOptions.map((opt, i) => (
                    <EditOptionRow
                      key={opt.id}
                      index={i}
                      control={editForm.control}
                      onRemove={removeEditOption}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={handleAddEditOption}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Option
                  </Button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                disabled={updateField.isPending}
              >
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
                    <FormControl>
                      <Input {...field} placeholder="e.g. Lead Source" />
                    </FormControl>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
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
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Required field</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {createFieldType === "select" && (
                <div className="space-y-2">
                  <FormLabel>Options</FormLabel>
                  {createOptions.map((opt, i) => (
                    <CreateOptionRow
                      key={opt.id}
                      index={i}
                      control={createForm.control}
                      onRemove={removeCreateOption}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={handleAddCreateOption}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Option
                  </Button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                disabled={createField.isPending}
              >
                {createField.isPending ? "Creating..." : "Create Field"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <PageWrapper
        title="Custom Fields"
        subtitle="Define additional fields for your CRM entities"
        actions={
          <Button
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        }
      >
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
              {ENTITY_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleEntityTab(tab.value)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150",
                    entityType === tab.value
                      ? "bg-white shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="space-y-2"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
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
              <motion.div
                variants={fadeUp}
                className="flex flex-1 items-center justify-center py-16"
              >
                <EmptyState
                  illustration={
                    <Sliders className="h-10 w-10 text-muted-foreground" />
                  }
                  title={`No custom fields for ${entityLabel} yet`}
                  description="Add your first field to capture additional data for this entity type."
                  action={{ label: "Add Field", onClick: handleOpenCreate }}
                />
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </PageWrapper>
    </>
  );
}
