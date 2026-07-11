import type { HrFormFieldType } from "./types";

export interface HrFieldTypeMeta {
  label: string;
  needsOptions: boolean;
  icon: string;
}

export const HR_FIELD_TYPE_META: Record<HrFormFieldType, HrFieldTypeMeta> = {
  text: { label: "Short Text", needsOptions: false, icon: "Type" },
  long_text: { label: "Long Text", needsOptions: false, icon: "AlignLeft" },
  number: { label: "Number", needsOptions: false, icon: "Hash" },
  date: { label: "Date", needsOptions: false, icon: "Calendar" },
  select: { label: "Dropdown", needsOptions: true, icon: "ChevronDown" },
  multi_select: { label: "Multi-select", needsOptions: true, icon: "CheckSquare" },
  boolean: { label: "Yes / No", needsOptions: false, icon: "ToggleLeft" },
  file: { label: "File Upload", needsOptions: false, icon: "Paperclip" },
  employee_ref: { label: "Employee", needsOptions: false, icon: "User" },
  department_ref: { label: "Department", needsOptions: false, icon: "Building2" },
  currency: { label: "Currency", needsOptions: false, icon: "DollarSign" },
};

export const HR_FIELD_TYPES = Object.keys(HR_FIELD_TYPE_META) as HrFormFieldType[];

export const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
};

export const SUBMISSION_STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  in_review: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
