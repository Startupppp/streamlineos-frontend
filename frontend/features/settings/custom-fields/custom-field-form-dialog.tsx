"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import {
  useCreateCustomField,
  useUpdateCustomField,
  type CustomFieldDefinition,
  type CreateCustomFieldInput,
} from "@/hooks/api/crm";
import { toast } from "sonner";

type EntityType = "lead" | "deal" | "contact";
type FieldType = "text" | "number" | "date" | "boolean" | "select";

interface SelectOption {
  value: string;
  label: string;
}

interface FieldFormState {
  label: string;
  name: string;
  fieldType: FieldType;
  options: SelectOption[];
  isRequired: boolean;
  sortOrder: number;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  boolean: "Yes / No",
  select: "Dropdown",
};

function autoName(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function getInitialForm(field: CustomFieldDefinition | null): FieldFormState {
  if (!field) {
    return {
      label: "",
      name: "",
      fieldType: "text",
      options: [{ value: "", label: "" }],
      isRequired: false,
      sortOrder: 0,
    };
  }
  return {
    label: field.label,
    name: field.name,
    fieldType: field.fieldType,
    options:
      field.options && field.options.length > 0
        ? field.options
        : [{ value: "", label: "" }],
    isRequired: field.isRequired,
    sortOrder: field.sortOrder,
  };
}

interface CustomFieldFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entityType: EntityType;
  editingField: CustomFieldDefinition | null;
  isCreate: boolean;
}

export function CustomFieldFormDialog({
  open,
  onOpenChange,
  entityType,
  editingField,
  isCreate,
}: CustomFieldFormDialogProps) {
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();

  const [form, setForm] = useState<FieldFormState>(() =>
    getInitialForm(editingField),
  );

  function handleOpenChange(v: boolean) {
    if (v) {
      setForm(getInitialForm(editingField));
    }
    onOpenChange(v);
  }

  function handleLabelChange(val: string) {
    setForm((prev) => ({
      ...prev,
      label: val,
      name: isCreate ? autoName(val) : prev.name,
    }));
  }

  function addOption() {
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, { value: "", label: "" }],
    }));
  }

  function removeOption(idx: number) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx),
    }));
  }

  function updateOption(idx: number, key: "value" | "label", val: string) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === idx ? { ...opt, [key]: val } : opt,
      ),
    }));
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isCreate) return;
    setForm((prev) => ({
      ...prev,
      name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
    }));
  }

  function handleFieldTypeChange(v: string) {
    setForm((prev) => ({ ...prev, fieldType: v as FieldType }));
  }

  function handleRequiredChange(v: boolean | "indeterminate") {
    setForm((prev) => ({ ...prev, isRequired: v === true }));
  }

  function handleSortOrderChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({
      ...prev,
      sortOrder: parseInt(e.target.value, 10) || 0,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.label.trim()) {
      toast.error("Label is required");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Field name is required");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(form.name)) {
      toast.error(
        "Name must be snake_case (lowercase letters, digits, underscores)",
      );
      return;
    }

    const options =
      form.fieldType === "select"
        ? form.options.filter((o) => o.value.trim() && o.label.trim())
        : undefined;

    try {
      if (isCreate) {
        const input: CreateCustomFieldInput = {
          entityType,
          name: form.name,
          label: form.label,
          fieldType: form.fieldType,
          options,
          isRequired: form.isRequired,
          sortOrder: form.sortOrder,
        };
        await createField.mutateAsync(input);
        toast.success("Custom field created");
      } else if (editingField) {
        await updateField.mutateAsync({
          id: editingField.id,
          entityType,
          label: form.label,
          options: form.fieldType === "select" ? (options ?? []) : null,
          isRequired: form.isRequired,
          sortOrder: form.sortOrder,
        });
        toast.success("Custom field updated");
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast.error(msg);
    }
  }

  const isBusy = createField.isPending || updateField.isPending;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isCreate ? "Add Custom Field" : "Edit Custom Field"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="cf-label">
              Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cf-label"
              value={form.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. Investor Type"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-name">
              Field Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cf-name"
              value={form.name}
              onChange={handleNameChange}
              placeholder="e.g. investor_type"
              disabled={!isCreate}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Machine name (snake_case). Cannot be changed after creation.
            </p>
          </div>

          {isCreate && (
            <div className="space-y-1.5">
              <Label htmlFor="cf-type">Field Type</Label>
              <Select value={form.fieldType} onValueChange={handleFieldTypeChange}>
                <SelectTrigger id="cf-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]
                  ).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.fieldType === "select" && (
            <div className="space-y-2">
              <Label>Dropdown Options</Label>
              <div className="space-y-2">
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="Value"
                      value={opt.value}
                      onChange={(e) => updateOption(idx, "value", e.target.value)}
                      className="font-mono text-xs"
                    />
                    <Input
                      placeholder="Label"
                      value={opt.label}
                      onChange={(e) => updateOption(idx, "label", e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => removeOption(idx)}
                      aria-label="Remove option"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Option
              </Button>
            </div>
          )}

          <Separator />

          <div className="flex items-center gap-3">
            <Checkbox
              id="cf-required"
              checked={form.isRequired}
              onCheckedChange={handleRequiredChange}
            />
            <Label htmlFor="cf-required" className="cursor-pointer">
              Required field
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-sort">Sort Order</Label>
            <Input
              id="cf-sort"
              type="number"
              value={form.sortOrder}
              onChange={handleSortOrderChange}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Lower numbers appear first.
            </p>
          </div>

          <SheetFooter className="flex-row gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isBusy}>
              {isBusy ? "Saving…" : isCreate ? "Create Field" : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
