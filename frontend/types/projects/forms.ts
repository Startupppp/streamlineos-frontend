export type FormType =
  | "task_request"
  | "bug_report"
  | "feature_request"
  | "change_request"
  | "client_approval"
  | "risk_report"
  | "qa_issue"
  | "generic";

export type FormFieldType =
  | "text"
  | "long_text"
  | "number"
  | "date"
  | "dropdown"
  | "multiselect"
  | "checkbox"
  | "url"
  | "user"
  | "currency"
  | "rating";

export type FormSubmissionStatus = "submitted" | "processed" | "rejected";

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
}

export interface FormAction {
  type: string;
  config?: Record<string, unknown>;
}

export interface ProjectForm {
  id: number;
  projectId: number;
  formNumber: number;
  name: string;
  description: string | null;
  type: FormType;
  fields: FormField[];
  actions: FormAction[];
  isActive: boolean;
  isPublic: boolean;
  publicToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: number;
  formId: number;
  projectId: number;
  values: Record<string, unknown>;
  status: FormSubmissionStatus;
  submittedByName: string | null;
  submittedById: string | null;
  convertedTicketId: number | null;
  createdAt: string;
}

export interface CreateFormInput {
  name: string;
  description?: string;
  type?: FormType;
  fields: FormField[];
  actions: FormAction[];
  isActive?: boolean;
  isPublic?: boolean;
}

export interface UpdateFormInput {
  name?: string;
  description?: string;
  type?: FormType;
  fields?: FormField[];
  actions?: FormAction[];
  isActive?: boolean;
  isPublic?: boolean;
}

export interface SubmitFormInput {
  values: Record<string, unknown>;
  submittedByName?: string;
}

export interface UpdateSubmissionInput {
  status: FormSubmissionStatus;
}

export interface SubmitFormResponse extends FormSubmission {
  createdTicketIds?: number[];
  executedActionTypes?: string[];
}
