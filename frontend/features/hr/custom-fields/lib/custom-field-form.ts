import * as z from "zod";
import type { HrCustomFieldDefinition } from "@/features/hr/forms/lib/types";

export const FIELD_TYPES = [
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
] as const;

export const ENTITY_TYPES = [
  { value: "employee", label: "Employee" },
  { value: "candidate", label: "Candidate" },
  { value: "leave", label: "Leave" },
  { value: "document", label: "Document" },
  { value: "asset", label: "Asset" },
  { value: "case", label: "Case" },
  { value: "department", label: "Department" },
  { value: "job_role", label: "Job Role" },
] as const;

export const RESERVED_KEYS = new Set([
  "id",
  "email",
  "salary",
  "role",
  "status",
  "created_at",
  "updated_at",
  "deleted_at",
  "org_id",
  "user_id",
  "employee_id",
]);

export const SENSITIVE_WARNING_TEXT =
  "Sensitive fields are restricted to HR admins by default. They will be excluded from standard exports and access will be audited. Only users with the hr:sensitive:manage permission can read or update this field's values.";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^(\d)/, "_$1")
    .replace(/_+/g, "_")
    .slice(0, 64);
}

export const nameSchema = z
  .string()
  .min(3, "Name must be at least 3 characters")
  .max(100, "Name must be at most 100 characters")
  .refine((v) => v.trim().length >= 3, "Name must not be whitespace-only")
  .refine(
    (v) => !/^[^a-zA-ZÀ-ɏ]+$/.test(v.trim()),
    "Name must contain at least one letter",
  );

export const keySchema = z
  .string()
  .min(1, "Key is required")
  .max(64, "Key must be at most 64 characters")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Key must start with a letter and contain only lowercase letters, numbers, and underscores",
  )
  .refine((v) => !RESERVED_KEYS.has(v), "This key is reserved and cannot be used");

export const fieldFormSchema = z.object({
  entityType: z.string().min(1, "Entity type is required"),
  name: nameSchema,
  key: z.string(),
  fieldType: z.string().min(1, "Field type is required"),
  isRequired: z.boolean(),
  isSensitive: z.boolean(),
  helpText: z.string().max(500).optional(),
  placeholder: z.string().max(200).optional(),
  options: z
    .array(
      z.object({
        label: z.string().min(1, "Label required"),
        value: z.string().min(1, "Value required"),
      }),
    )
    .optional(),
  validationMinLength: z.string().optional(),
  validationMaxLength: z.string().optional(),
  validationMinValue: z.string().optional(),
  validationMaxValue: z.string().optional(),
  validationDateMin: z.string().optional(),
  validationDateMax: z.string().optional(),
  visibilityHrOnly: z.boolean(),
  visibilityManagerVisible: z.boolean(),
  visibilitySelfService: z.boolean(),
  visibilityHiddenFromExports: z.boolean(),
  searchable: z.boolean(),
  reportable: z.boolean(),
});

export type FieldFormValues = z.infer<typeof fieldFormSchema>;

export function getDefaultValues(
  field: HrCustomFieldDefinition | undefined,
  entityType: string,
): FieldFormValues {
  return {
    entityType: field?.entityType ?? entityType,
    name: field?.name ?? "",
    key: field?.key ?? "",
    fieldType: field?.fieldType ?? "text",
    isRequired: field?.isRequired ?? false,
    isSensitive: field?.isSensitive ?? false,
    helpText: field?.settings?.helpText ?? "",
    placeholder: field?.settings?.placeholder ?? "",
    options: field?.options ?? [],
    validationMinLength:
      field?.settings?.validationRules?.minLength != null
        ? String(field.settings.validationRules.minLength)
        : "",
    validationMaxLength:
      field?.settings?.validationRules?.maxLength != null
        ? String(field.settings.validationRules.maxLength)
        : "",
    validationMinValue:
      field?.settings?.validationRules?.minValue != null
        ? String(field.settings.validationRules.minValue)
        : "",
    validationMaxValue:
      field?.settings?.validationRules?.maxValue != null
        ? String(field.settings.validationRules.maxValue)
        : "",
    validationDateMin: field?.settings?.validationRules?.dateMin ?? "",
    validationDateMax: field?.settings?.validationRules?.dateMax ?? "",
    visibilityHrOnly: field?.settings?.visibility?.hrOnly ?? false,
    visibilityManagerVisible: field?.settings?.visibility?.managerVisible ?? true,
    visibilitySelfService: field?.settings?.visibility?.selfServiceVisible ?? false,
    visibilityHiddenFromExports: field?.settings?.visibility?.hiddenFromExports ?? false,
    searchable: field?.settings?.searchable ?? true,
    reportable: field?.settings?.reportable ?? true,
  };
}
