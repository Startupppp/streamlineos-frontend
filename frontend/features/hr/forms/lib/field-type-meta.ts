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
  submitted: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  in_review: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  approved: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  rejected: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
