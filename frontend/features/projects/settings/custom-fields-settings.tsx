"use client";

import { memo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useProjectCustomFields,
  useCreateProjectCustomField,
  useDeleteProjectCustomField,
} from "@/hooks/api/projects/custom-fields";
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
import { Sliders } from "lucide-react";
import { Trash2Icon, PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
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
import type { CustomFieldType } from "@/types/projects/tasks";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/features/projects/shared/text-overflow";

const customFieldSchema = z.object({
  fieldName: z.string().min(1, "Field name is required"),
  fieldType: z.string(),
  options: z.string(),
});

type CustomFieldFormValues = z.infer<typeof customFieldSchema>;

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
  number: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  date: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  user: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  select: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  multi_select: "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
  checkbox: "bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300",
  url: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
  currency: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300",
};

interface CustomFieldItem {
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
}

const CustomFieldRow = memo(function CustomFieldRow({
  field,
  index,
  onDelete,
}: CustomFieldRowProps) {
  const handleDelete = useCallback(() => onDelete(field.id), [field.id, onDelete]);
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
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            Options: {field.options.join(", ")}
          </p>
        )}
      </div>
      <Badge
        variant="secondary"
        className={`text-[10px] shrink-0 ${fieldTypeColors[field.type]}`}
      >
        {field.type.replace("_", " ")}
      </Badge>
      {field.required && (
        <Badge
          variant="outline"
          className="text-[10px] shrink-0 border-red-200 text-red-600 dark:border-red-500/30 dark:text-red-400"
        >
          required
        </Badge>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="w-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
            aria-label="Delete field"
            {...deleteHoverHandlers}
          >
            <Trash2Icon ref={deleteIconRef} size={14} />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete custom field?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the field and all its values from all
              tickets. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
});

interface CustomFieldsSettingsProps {
  projectId: number;
}

export function CustomFieldsSettings({ projectId }: CustomFieldsSettingsProps) {
  const [showForm, setShowForm] = useState(false);

  const { data: fields = [], isLoading } = useProjectCustomFields(projectId);
  const createField = useCreateProjectCustomField(projectId);
  const deleteField = useDeleteProjectCustomField(projectId);

  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: { fieldName: "", fieldType: "text", options: "" },
  });

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
      { name: values.fieldName.trim(), type: values.fieldType as CustomFieldType, options: parsedOptions },
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

  const handleShowForm = useCallback(() => setShowForm(true), []);

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
        {!showForm ? (
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
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {fields.length === 0 && !showForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-2 py-4 text-center"
              >
                <Sliders className="w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  No custom fields yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Add fields to capture additional ticket data
                </p>
              </motion.div>
            )}

            {fields.map((field, idx) => (
              <CustomFieldRow
                key={field.id}
                field={field}
                index={idx}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleCreate)}
                    className="p-4 rounded-lg border border-border bg-muted/30 space-y-3"
                  >
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
                            <FormMessage className="text-[10px]" />
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
                            <FormMessage className="text-[10px]" />
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
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    )}
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
    </div>
  );
}
