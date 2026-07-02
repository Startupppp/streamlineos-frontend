"use client";

import { useState, useCallback } from "react";
import {
  useProjectCustomFields,
  useCreateProjectCustomField,
  useDeleteProjectCustomField,
} from "@/hooks/api/projects/custom-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Plus, Sliders } from "lucide-react";
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
  text: "bg-slate-100 text-slate-600",
  number: "bg-blue-100 text-blue-700",
  date: "bg-amber-100 text-amber-700",
  user: "bg-violet-100 text-violet-700",
  select: "bg-emerald-100 text-emerald-700",
  multi_select: "bg-teal-100 text-teal-700",
  checkbox: "bg-pink-100 text-pink-700",
  url: "bg-indigo-100 text-indigo-700",
  currency: "bg-green-100 text-green-700",
};

interface CustomFieldsSettingsProps {
  projectId: number;
}

export function CustomFieldsSettings({ projectId }: CustomFieldsSettingsProps) {
  const [showForm, setShowForm] = useState(false);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<CustomFieldType>("text");
  const [options, setOptions] = useState("");

  const { data: fields = [], isLoading } = useProjectCustomFields(projectId);
  const createField = useCreateProjectCustomField(projectId);
  const deleteField = useDeleteProjectCustomField(projectId);

  const handleFieldNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setFieldName(e.target.value),
    [],
  );

  const handleOptionsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setOptions(e.target.value),
    [],
  );

  const handleFieldTypeChange = useCallback((v: string) => {
    setFieldType(v as CustomFieldType);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setFieldName("");
    setOptions("");
    setFieldType("text");
  }, []);

  const handleCreate = useCallback(() => {
    if (!fieldName.trim()) return;
    const parsedOptions =
      (fieldType === "select" || fieldType === "multi_select") && options.trim()
        ? options
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : null;

    createField.mutate(
      { name: fieldName.trim(), type: fieldType, options: parsedOptions },
      {
        onSuccess: () => {
          setFieldName("");
          setFieldType("text");
          setOptions("");
          setShowForm(false);
          toast.success("Custom field created");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [fieldName, fieldType, options, createField]);

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
                  className="flex flex-col items-center gap-2 py-8 text-center"
                >
                  <Sliders className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-muted-foreground">
                    No custom fields yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add fields to capture additional ticket data
                  </p>
                </motion.div>
              )}

              {fields.map((field, idx) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: idx * 0.03 }}
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
                      className="text-[10px] shrink-0 border-red-200 text-red-600"
                    >
                      required
                    </Badge>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                        aria-label="Delete field"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
                          onClick={() => handleDelete(field.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-xl border border-violet-200 bg-violet-50/30 space-y-3 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Field Name</Label>
                      <Input
                        value={fieldName}
                        onChange={handleFieldNameChange}
                        placeholder="e.g. Story Points"
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={fieldType}
                        onValueChange={handleFieldTypeChange}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((t) => (
                            <SelectItem
                              key={t.value}
                              value={t.value}
                              className="text-sm"
                            >
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {(fieldType === "select" || fieldType === "multi_select") && (
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Options (comma-separated)
                      </Label>
                      <Input
                        value={options}
                        onChange={handleOptionsChange}
                        placeholder="Option 1, Option 2, Option 3"
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreate}
                      disabled={!fieldName.trim() || createField.isPending}
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white h-7 text-xs"
                    >
                      {createField.isPending ? "Creating..." : "Create Field"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelForm}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowForm}
                className="h-7 text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Custom Field
              </Button>
            )}
          </div>
        )}
    </div>
  );
}
