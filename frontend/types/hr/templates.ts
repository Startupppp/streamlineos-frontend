export const HR_TEMPLATE_KINDS = [
  "onboarding_checklist",
  "offboarding_checklist",
  "probation_review",
  "performance_review",
  "goal",
  "letter",
  "document_request",
  "email",
  "notification",
  "survey",
  "training",
  "asset_assignment",
  "exit_interview",
] as const;

export type HrTemplateKind = (typeof HR_TEMPLATE_KINDS)[number];

export const HR_TEMPLATE_STATUSES = ["draft", "review", "approved", "active", "archived"] as const;
export type HrTemplateStatus = (typeof HR_TEMPLATE_STATUSES)[number];

export const HR_LETTER_TYPES = [
  "offer",
  "appointment",
  "confirmation",
  "promotion",
  "transfer",
  "salary_revision",
  "warning",
  "experience",
  "relieving",
  "termination",
] as const;
export type HrLetterType = (typeof HR_LETTER_TYPES)[number];

export interface ChecklistItem {
  id: string;
  title: string;
  assigneeRole: "hr" | "manager" | "it" | "employee" | "buddy";
  dueOffsetDays: number;
  required: boolean;
  order: number;
}

export interface ReviewQuestion {
  id: string;
  text: string;
  type: "rating" | "text" | "boolean";
  required: boolean;
}

export interface ReviewSection {
  id: string;
  title: string;
  questions: ReviewQuestion[];
}

export interface SurveyQuestion {
  id: string;
  text: string;
  type: "rating" | "text" | "boolean" | "multiple_choice";
  options?: string[];
  required: boolean;
  order: number;
}

export interface HrTemplate {
  id: number;
  orgId: string;
  kind: HrTemplateKind;
  name: string;
  description: string | null;
  status: HrTemplateStatus;
  version: number;
  parentTemplateId: number | null;
  content: Record<string, unknown>;
  variablesUsed: string[];
  letterType: HrLetterType | null;
  createdBy: string;
  updatedBy: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type HrTemplateListItem = Omit<HrTemplate, "content">;

export interface TemplateListResponse {
  data: HrTemplateListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface TemplateVariable {
  token: string;
  label: string;
  group: string;
  sensitive: boolean;
  example: string;
}

export interface RenderResponse {
  outputHtml: string;
  renderedSubject?: string;
  renderId: number;
  templateVersion: number;
}

export const KIND_LABELS: Record<HrTemplateKind, string> = {
  onboarding_checklist: "Onboarding Checklist",
  offboarding_checklist: "Offboarding Checklist",
  probation_review: "Probation Review",
  performance_review: "Performance Review",
  goal: "Goal",
  letter: "Letter",
  document_request: "Document Request",
  email: "Email",
  notification: "Notification",
  survey: "Survey",
  training: "Training",
  asset_assignment: "Asset Assignment",
  exit_interview: "Exit Interview",
};

export const STATUS_LABELS: Record<HrTemplateStatus, string> = {
  draft: "Draft",
  review: "In Review",
  approved: "Approved",
  active: "Active",
  archived: "Archived",
};

export const LETTER_TYPE_LABELS: Record<HrLetterType, string> = {
  offer: "Offer Letter",
  appointment: "Appointment Letter",
  confirmation: "Confirmation Letter",
  promotion: "Promotion Letter",
  transfer: "Transfer Letter",
  salary_revision: "Salary Revision Letter",
  warning: "Warning Letter",
  experience: "Experience Certificate",
  relieving: "Relieving Letter",
  termination: "Termination Letter",
};
