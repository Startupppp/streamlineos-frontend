import type { FormFieldType, FormType } from "@/types/projects/forms";

export interface FieldTypeMeta {
  label: string;
  needsOptions: boolean;
}

export const FIELD_TYPE_META: Record<FormFieldType, FieldTypeMeta> = {
  text: { label: "Short Text", needsOptions: false },
  long_text: { label: "Long Text", needsOptions: false },
  number: { label: "Number", needsOptions: false },
  date: { label: "Date", needsOptions: false },
  dropdown: { label: "Dropdown", needsOptions: true },
  multiselect: { label: "Multi-select", needsOptions: true },
  checkbox: { label: "Checkbox", needsOptions: false },
  url: { label: "URL", needsOptions: false },
  user: { label: "User", needsOptions: false },
  currency: { label: "Currency", needsOptions: false },
  rating: { label: "Rating (1–5)", needsOptions: false },
};

export const FORM_TYPE_LABELS: Record<FormType, string> = {
  task_request: "Task Request",
  bug_report: "Bug Report",
  feature_request: "Feature Request",
  change_request: "Change Request",
  client_approval: "Client Approval",
  risk_report: "Risk Report",
  qa_issue: "QA Issue",
  generic: "Generic",
};

export const FIELD_TYPES = Object.keys(FIELD_TYPE_META) as FormFieldType[];
export const FORM_TYPES = Object.keys(FORM_TYPE_LABELS) as FormType[];
