"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
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
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Pencil } from "lucide-react";
import {
  useSupportCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  type SupportCustomField,
  type CustomFieldType,
} from "@/hooks/api/support/custom-fields";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { fieldSchema, type FieldForm } from "@/features/support/settings/custom-field-form.schema";

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
];

function fieldTypeLabel(type: string) {
  return FIELD_TYPES.find((t) => t.value === type)?.label ?? type;
}

interface FieldDialogProps {
  field?: SupportCustomField;
  onClose: () => void;
}

function FieldDialog({ field, onClose }: FieldDialogProps) {
  const isEdit = !!field;
  const create = useCreateCustomField();
  const update = useUpdateCustomField();
  const isPending = create.isPending || update.isPending;

  const form = useForm<FieldForm>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      key: field?.key ?? "",
      label: field?.label ?? "",
      fieldType: field?.fieldType ?? "text",
      optionsText: field?.options?.join(", ") ?? "",
      required: field?.required ?? false,
      category: field?.category ?? "",
      isActive: field?.isActive ?? true,
    },
  });

  const fieldType = form.watch("fieldType");

  const onSubmit = useCallback(
    (data: FieldForm) => {
      const options = data.fieldType === "select"
        ? data.optionsText.split(",").map((o) => o.trim()).filter(Boolean)
        : undefined;

      if (isEdit) {
        update.mutate(
          {
            id: field.id,
            input: {
              label: data.label,
              options,
              required: data.required,
              category: data.category.trim() || null,
              isActive: data.isActive,
            },
          },
          {
            onSuccess: () => {
              toast.success("Field updated");
              onClose();
            },
            onError: (error) => toast.error(getErrorMessage(error)),
          },
        );
      } else {
        create.mutate(
          {
            key: data.key,
            label: data.label,
            fieldType: data.fieldType,
            options,
            required: data.required,
            category: data.category.trim() || undefined,
            isActive: data.isActive,
          },
          {
            onSuccess: () => {
              toast.success("Field created");
              onClose();
            },
            onError: (error) => toast.error(getErrorMessage(error)),
          },
        );
      }
    },
    [create, update, isEdit, field, onClose],
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Field" : "New Field"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="key"
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Key</FormLabel>
                  <FormControl>
                    <Input {...f} placeholder="e.g. order_number" disabled={isEdit} />
                  </FormControl>
                  {isEdit && <FormDescription>The key cannot be changed after creation.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input {...f} placeholder="e.g. Order #" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fieldType"
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Field Type</FormLabel>
                  <Select onValueChange={f.onChange} value={f.value} disabled={isEdit}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FIELD_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEdit && <FormDescription>Field type cannot be changed after creation.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />

            {fieldType === "select" && (
              <FormField
                control={form.control}
                name="optionsText"
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Options (comma separated)</FormLabel>
                    <FormControl>
                      <Input {...f} placeholder="e.g. Low, Medium, High" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="category"
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Category (optional)</FormLabel>
                  <FormControl>
                    <Input {...f} placeholder="Only show for this ticket category" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="required"
              render={({ field: f }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="mb-0">Required</FormLabel>
                  <FormControl>
                    <Switch checked={f.value} onCheckedChange={f.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field: f }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="mb-0">Active</FormLabel>
                  <FormControl>
                    <Switch checked={f.value} onCheckedChange={f.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface FieldRowProps {
  field: SupportCustomField;
  onToggle: (field: SupportCustomField) => void;
  onEdit: (field: SupportCustomField) => void;
  onDelete: (field: SupportCustomField) => void;
}

function FieldRow({ field, onToggle, onEdit, onDelete }: FieldRowProps) {
  const handleToggle = useCallback(() => onToggle(field), [field, onToggle]);
  const handleEdit = useCallback(() => onEdit(field), [field, onEdit]);
  const handleDelete = useCallback(() => onDelete(field), [field, onDelete]);

  return (
    <Card className={field.isActive ? "" : "opacity-60"}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium truncate">{field.label}</h3>
              <Badge variant="secondary" className="text-micro">
                {fieldTypeLabel(field.fieldType)}
              </Badge>
              {field.required && (
                <Badge variant="outline" className="text-micro">
                  Required
                </Badge>
              )}
              {field.category && (
                <Badge variant="outline" className="text-micro">
                  {field.category}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono truncate">{field.key}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={field.isActive} onCheckedChange={handleToggle} />
            <Button variant="ghost" size="icon" className="w-7" onClick={handleEdit} aria-label="Edit field">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AnimatedIconButton
              variant="ghost"
              size="icon"
              className="w-7 text-destructive"
              onClick={handleDelete}
              aria-label="Delete field"
              icon={Trash2Icon}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SupportCustomFieldsPage() {
  const { data: fields, isLoading, isError, refetch } = useSupportCustomFields();
  const updateField = useUpdateCustomField();
  const deleteField = useDeleteCustomField();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupportCustomField | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupportCustomField | null>(null);

  const handleToggle = useCallback(
    (field: SupportCustomField) => {
      updateField.mutate(
        { id: field.id, input: { isActive: !field.isActive } },
        {
          onSuccess: () => toast.success(field.isActive ? "Field deactivated" : "Field activated"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [updateField],
  );

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteField.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Field deleted");
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [deleteTarget, deleteField]);

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleRetry() {
    void refetch();
  }

  function handleCloseCreate() {
    setCreateOpen(false);
  }

  function handleCloseEdit() {
    setEditTarget(null);
  }

  function handleDeleteOpenChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  return (
    <PageWrapper
      title="Custom Fields"
      subtitle="Fields captured at ticket creation, on top of title/description/priority/category"
      actions={
        <AnimatedIconButton size="sm" onClick={handleOpenCreate} icon={PlusIcon} iconClassName="mr-1.5">
          New Field
        </AnimatedIconButton>
      }
    >
      {isLoading ? (
        <LoadingState variant="list" rows={12} />
      ) : isError ? (
        <ErrorState onRetry={handleRetry} />
      ) : fields && fields.length > 0 ? (
        <div className="flex flex-1 min-h-0 flex-col space-y-3">
          {fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              onToggle={handleToggle}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          illustration={<EmptyInboxIllustration />}
          title="No custom fields yet"
          description="Add fields like order number or account ID to capture structured info on every ticket."
          action={{ label: "New Field", onClick: handleOpenCreate }}
          className="flex-1"
        />
      )}

      {createOpen && <FieldDialog onClose={handleCloseCreate} />}
      {editTarget && <FieldDialog field={editTarget} onClose={handleCloseEdit} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete field?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.label}&rdquo; and all its captured values across every ticket will be
              permanently deleted.
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
    </PageWrapper>
  );
}
