"use client";

import { useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { HrSheet } from "@/features/hr/hr-sheet";

const ALL_ROLES = ["OWNER", "ORG_ADMIN", "MEMBER"];

const documentTypeFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .refine((v) => v.trim().length >= 2, "Name must be at least 2 characters")
    .refine((v) => /[a-zA-Z0-9]/.test(v.trim()), "Name must contain at least one letter or digit"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters"),
  isMandatory: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z
    .string()
    .refine(
      (v) => !v || /^\d+$/.test(v.trim()),
      "Sort order must be a non-negative whole number",
    ),
  applicableRoles: z.array(z.string()),
});

type DocumentTypeFormValues = z.infer<typeof documentTypeFormSchema>;

export interface DocumentTypeFormData {
  name: string;
  description?: string;
  isMandatory: boolean;
  isActive: boolean;
  sortOrder?: number;
  applicableRoles: string[];
}

interface DocumentTypeFormDialogProps {
  open: boolean;
  isEditing: boolean;
  defaultValues?: Partial<DocumentTypeFormData>;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DocumentTypeFormData) => void;
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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function DocumentTypeFormDialog({
  open,
  isEditing,
  defaultValues,
  isPending,
  onOpenChange,
  onSubmit,
}: DocumentTypeFormDialogProps) {
  const form = useForm<DocumentTypeFormValues>({
    resolver: zodResolver(documentTypeFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      isMandatory: defaultValues?.isMandatory ?? false,
      isActive: defaultValues?.isActive ?? true,
      sortOrder: defaultValues?.sortOrder != null ? String(defaultValues.sortOrder) : "",
      applicableRoles: defaultValues?.applicableRoles ?? [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: defaultValues?.name ?? "",
        description: defaultValues?.description ?? "",
        isMandatory: defaultValues?.isMandatory ?? false,
        isActive: defaultValues?.isActive ?? true,
        sortOrder: defaultValues?.sortOrder != null ? String(defaultValues.sortOrder) : "",
        applicableRoles: defaultValues?.applicableRoles ?? [],
      });
    }
  }, [open, defaultValues, form]);

  const triggerSubmit = useCallback(() => {
    void form.handleSubmit((values) => {
      const trimmedName = values.name.trim().replace(/\s+/g, " ");
      const trimmedDesc = values.description.trim();
      onSubmit({
        name: trimmedName,
        description: trimmedDesc || undefined,
        isMandatory: values.isMandatory,
        isActive: values.isActive,
        sortOrder: values.sortOrder.trim() ? Number(values.sortOrder.trim()) : undefined,
        applicableRoles: values.applicableRoles,
      });
    })();
  }, [form, onSubmit]);

  const nameValue = form.watch("name");

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
      onSubmit={triggerSubmit}
      submitLabel={isEditing ? "Save Changes" : "Create"}
      isPending={isPending}
    >
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="e.g. National ID / Aadhaar Card"
          {...form.register("name")}
          className=""
          aria-label="Document type name"
        />
        {form.formState.errors.name && (
          <p className="text-[11px] text-destructive">{form.formState.errors.name.message}</p>
        )}
        {nameValue && !form.formState.errors.name && (
          <p className="text-[11px] text-muted-foreground">
            Slug:{" "}
            <code className="font-mono bg-muted px-1 rounded text-[10px]">
              {slugify(nameValue)}
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
          {...form.register("description")}
          rows={2}
          className="resize-none"
          aria-label="Description"
        />
        {form.formState.errors.description && (
          <p className="text-[11px] text-destructive">{form.formState.errors.description.message}</p>
        )}
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
          <Controller
            control={form.control}
            name="isMandatory"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label="Mandatory"
              />
            )}
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
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Active"
                />
              )}
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
          placeholder="Auto-assigned if empty"
          {...form.register("sortOrder")}
          className=""
          aria-label="Sort order"
        />
        {form.formState.errors.sortOrder && (
          <p className="text-[11px] text-destructive">{form.formState.errors.sortOrder.message}</p>
        )}
        <p className="text-[11px] text-muted-foreground">
          Lower numbers appear first. Leave empty to auto-assign.
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
        <Controller
          control={form.control}
          name="applicableRoles"
          render={({ field }) => {
            function handleToggle(role: string) {
              const next = field.value.includes(role)
                ? field.value.filter((x) => x !== role)
                : [...field.value, role];
              field.onChange(next);
            }
            return (
              <div className="grid grid-cols-2 gap-2">
                {ALL_ROLES.map((r) => (
                  <RoleCheckbox
                    key={r}
                    role={r}
                    checked={field.value.includes(r)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            );
          }}
        />
      </div>
    </HrSheet>
  );
}
