"use client";

import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import type { HrCustomFieldDefinition, CreateCustomFieldPayload, UpdateCustomFieldPayload } from "@/features/hr/forms/lib/types";

const FIELD_TYPES = [
  { value: "text", label: "Short Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "multi_select", label: "Multi-select" },
  { value: "boolean", label: "Yes / No" },
  { value: "file", label: "File" },
  { value: "employee_ref", label: "Employee" },
  { value: "department_ref", label: "Department" },
  { value: "currency", label: "Currency" },
];

interface FormValues {
  name: string;
  key: string;
  fieldType: string;
  isSensitive: boolean;
  isRequired: boolean;
}

interface CustomFieldUpsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  field?: HrCustomFieldDefinition;
  onSave: (payload: CreateCustomFieldPayload | UpdateCustomFieldPayload) => Promise<void>;
  isPending: boolean;
}

export function CustomFieldUpsertDialog({
  open,
  onOpenChange,
  entityType,
  field,
  onSave,
  isPending,
}: CustomFieldUpsertDialogProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: field?.name ?? "",
      key: field?.key ?? "",
      fieldType: field?.fieldType ?? "text",
      isSensitive: field?.isSensitive ?? false,
      isRequired: field?.isRequired ?? false,
    },
  });

  const isSensitive = watch("isSensitive");
  const isRequired = watch("isRequired");
  const fieldType = watch("fieldType");

  async function onSubmit(values: FormValues) {
    if (field) {
      await onSave({ name: values.name, isSensitive: values.isSensitive, isRequired: values.isRequired } as UpdateCustomFieldPayload);
    } else {
      await onSave({
        entityType,
        name: values.name,
        key: values.key,
        fieldType: values.fieldType,
        isSensitive: values.isSensitive,
        isRequired: values.isRequired,
      } as CreateCustomFieldPayload);
    }
  }

  function handleCancelClick() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{field ? "Edit Custom Field" : "New Custom Field"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input
              {...register("name", { required: true })}
              className="h-8 text-sm"
              placeholder="e.g. Employee ID"
            />
            {errors.name && <p className="text-xs text-destructive">Name is required</p>}
          </div>

          {!field && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Key *</Label>
                <Input
                  {...register("key", {
                    required: true,
                    pattern: { value: /^[a-z][a-z0-9_]*$/, message: "Must be snake_case" },
                  })}
                  className="h-8 text-sm font-mono"
                  placeholder="employee_id"
                />
                {errors.key && <p className="text-xs text-destructive">{errors.key.message ?? "Key is required"}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={fieldType} onValueChange={(v) => setValue("fieldType", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="flex items-center gap-6 pt-1">
            <div className="flex items-center gap-2">
              <Switch checked={isRequired} onCheckedChange={(v) => setValue("isRequired", v)} />
              <Label className="text-sm">Required</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isSensitive} onCheckedChange={(v) => setValue("isSensitive", v)} />
              <Label className="text-sm">Sensitive</Label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancelClick}>
              Cancel
            </Button>
            <LoadingButton type="submit" size="sm" isPending={isPending}>
              {field ? "Save" : "Create"}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
