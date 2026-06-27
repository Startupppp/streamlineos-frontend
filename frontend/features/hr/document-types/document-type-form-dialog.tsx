"use client";

import { useCallback } from "react";
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

interface RoleCheckboxProps {
  role: string;
  checked: boolean;
  onToggle: (role: string) => void;
}

function RoleCheckbox({ role, checked, onToggle }: RoleCheckboxProps) {
  const handleChange = useCallback(() => onToggle(role), [role, onToggle]);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 hover:bg-muted/40 transition-colors duration-200">
      <Checkbox
        id={`role-${role}`}
        checked={checked}
        onCheckedChange={handleChange}
        aria-label={role}
      />
      <Label
        htmlFor={`role-${role}`}
        className="text-xs font-normal cursor-pointer"
      >
        {role}
      </Label>
    </div>
  );
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
        <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="e.g. National ID / Aadhaar Card"
          value={form.name}
          onChange={handleNameChange}
          className="h-9"
          aria-label="Document type name"
        />
        {form.name && (
          <p className="text-[11px] text-muted-foreground">
            Slug:{" "}
            <code className="font-mono bg-muted px-1 rounded text-[10px]">
              {slugify(form.name)}
            </code>
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Description{" "}
          <span className="text-muted-foreground font-normal normal-case">(optional)</span>
        </Label>
        <Textarea
          placeholder="Brief description of what this document is..."
          value={form.description}
          onChange={handleDescriptionChange}
          rows={2}
          className="resize-none"
          aria-label="Description"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Settings
        </p>

        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Mandatory Document</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
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
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Active</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
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
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Sort Order{" "}
          <span className="text-muted-foreground font-normal normal-case">(optional)</span>
        </Label>
        <Input
          type="number"
          min="0"
          step="1"
          placeholder="e.g. 1"
          value={form.sortOrder}
          onChange={handleSortOrderChange}
          className="h-9"
          aria-label="Sort order"
        />
        <p className="text-[11px] text-muted-foreground">
          Lower numbers appear first in the checklist.
        </p>
      </div>

      <Separator />

      <div className="space-y-2.5">
        <div>
          <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Applicable Roles
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Leave empty to apply to all roles.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ALL_ROLES.map((r) => (
            <RoleCheckbox
              key={r}
              role={r}
              checked={form.applicableRoles.includes(r)}
              onToggle={onToggleRole}
            />
          ))}
        </div>
      </div>
    </HrSheet>
  );
}
