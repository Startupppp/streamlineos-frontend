import type { z } from "zod";
import type { hrFormRowContract, hrFormSubmissionRowContract } from "@/features/hr/forms/hooks/hr-forms-schema";

export type HrFormFieldType =
  | "text"
  | "long_text"
  | "number"
  | "date"
  | "select"
  | "multi_select"
  | "boolean"
  | "file"
  | "employee_ref"
  | "department_ref"
  | "currency";

export type HrFormAudience = "internal" | "public";
export type HrFormSubmissionStatus = "submitted" | "in_review" | "approved" | "rejected";

export interface HrFormFieldConditional {
  fieldKey: string;
  operator: "eq" | "neq" | "contains" | "notEmpty";
  value?: unknown;
}

export interface HrFormFieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
}

export interface HrFormField {
  key: string;
  label: string;
  type: HrFormFieldType;
  required: boolean;
  sensitive: boolean;
  options?: { label: string; value: string }[];
  conditional?: HrFormFieldConditional | null;
  validation?: HrFormFieldValidation | null;
}

export type HrForm = z.infer<typeof hrFormRowContract>;

export type HrFormSubmission = z.infer<typeof hrFormSubmissionRowContract>;

export interface CreateHrFormPayload {
  name: string;
  slug: string;
  description?: string;
  audience: HrFormAudience;
  workflowObjectType?: string | null;
  schema: HrFormField[];
}

export interface UpdateHrFormPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  audience?: HrFormAudience;
  workflowObjectType?: string | null;
  schema?: HrFormField[];
}

export interface SubmitHrFormPayload {
  data: Record<string, unknown>;
  submittedByName?: string;
  subjectEmployeeId?: number;
}

export interface HrCustomFieldSettings {
  helpText?: string;
  placeholder?: string;
  defaultValue?: unknown;
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    allowedOptions?: string[];
    dateMin?: string;
    dateMax?: string;
  };
  visibility?: {
    hrOnly?: boolean;
    managerVisible?: boolean;
    selfServiceVisible?: boolean;
    hiddenFromExports?: boolean;
  };
  searchable?: boolean;
  reportable?: boolean;
}

export interface HrCustomFieldDefinition {
  id: number;
  orgId: string;
  entityType: string;
  name: string;
  key: string;
  fieldType: string;
  options: { label: string; value: string }[] | null;
  settings: HrCustomFieldSettings | null;
  isSensitive: boolean;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomFieldPayload {
  entityType: string;
  name: string;
  key: string;
  fieldType: string;
  options?: { label: string; value: string }[];
  settings?: HrCustomFieldSettings;
  isSensitive?: boolean;
  isRequired?: boolean;
  displayOrder?: number;
}

export interface UpdateCustomFieldPayload {
  name?: string;
  options?: { label: string; value: string }[];
  settings?: HrCustomFieldSettings;
  isSensitive?: boolean;
  isRequired?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}
