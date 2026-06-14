"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { HrSheet } from "@/features/hr/hr-sheet";

const ALL_ROLES = [
  "CEO",
  "HR",
  "SALES",
  "ENGINEERING",
  "DESIGN",
  "DIGITAL_MARKETING",
  "VIDEO_EDITOR",
  "CUSTOMER_SUPPORT",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

interface FormState {
  name: string;
  description: string;
  isMandatory: boolean;
  isActive: boolean;
  sortOrder: string;
  applicableRoles: string[];
}

interface DocumentTypeFormDialogProps {
  open: boolean;
  isEditing: boolean;
  form: FormState;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSetField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onToggleRole: (role: string) => void;
  onSubmit: () => void;
}

export function DocumentTypeFormDialog({
  open,
  isEditing,
  form,
  isPending,
  onOpenChange,
  onSetField,
  onToggleRole,
  onSubmit,
}: DocumentTypeFormDialogProps) {
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    onSetField("name", e.target.value);
  }

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onSetField("description", e.target.value);
  }

  function handleSortOrderChange(e: React.ChangeEvent<HTMLInputElement>) {
    onSetField("sortOrder", e.target.value);
  }

  function handleMandatoryChange(v: boolean) {
    onSetField("isMandatory", v);
  }

  function handleActiveChange(v: boolean) {
    onSetField("isActive", v);
  }

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Document Type" : "Add Document Type"}
      description={
        isEditing
          ? "Update the document type configuration."
          : "Define a new document required during employee onboarding."
      }
      onSubmit={onSubmit}
      submitLabel={isEditing ? "Save Changes" : "Create"}
      isPending={isPending}
    >
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="e.g. National ID / Aadhaar Card"
          value={form.name}
          onChange={handleNameChange}
          aria-label="Document type name"
        />
        {form.name && (
          <p className="text-[11px] text-muted-foreground">
            Slug: {slugify(form.name)}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Description{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          placeholder="Brief description of what this document is..."
          value={form.description}
          onChange={handleDescriptionChange}
          rows={2}
          aria-label="Description"
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">Mandatory Document</p>
          <p className="text-xs text-muted-foreground">
            Employees must submit this before onboarding is complete.
          </p>
        </div>
        <Switch
          checked={form.isMandatory}
          onCheckedChange={handleMandatoryChange}
          aria-label="Mandatory"
        />
      </div>

      {isEditing && (
        <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">
              Inactive types won&apos;t appear in new onboarding checklists.
            </p>
          </div>
          <Switch
            checked={form.isActive}
            onCheckedChange={handleActiveChange}
            aria-label="Active"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Sort Order{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          type="number"
          min="0"
          step="1"
          placeholder="e.g. 1"
          value={form.sortOrder}
          onChange={handleSortOrderChange}
          aria-label="Sort order"
        />
        <p className="text-[11px] text-muted-foreground">
          Lower numbers appear first in the checklist.
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Applicable Roles{" "}
          <span className="text-muted-foreground font-normal">
            (leave empty = all roles)
          </span>
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {ALL_ROLES.map((r) => (
            <div key={r} className="flex items-center gap-2">
              <Checkbox
                id={`role-${r}`}
                checked={form.applicableRoles.includes(r)}
                onCheckedChange={() => onToggleRole(r)}
                aria-label={r}
              />
              <Label
                htmlFor={`role-${r}`}
                className="text-xs font-normal cursor-pointer"
              >
                {r}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </HrSheet>
  );
}
