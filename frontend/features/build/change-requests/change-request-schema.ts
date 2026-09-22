import { z } from "zod";
import type { ChangeRequestStatus } from "@/types/projects";

export const CR_STATUSES: ChangeRequestStatus[] = [
  "submitted", "under_review", "estimated", "awaiting_approval",
  "approved", "rejected", "in_progress", "completed",
];

export const CR_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  submitted: "Submitted", under_review: "Under Review", estimated: "Estimated",
  awaiting_approval: "Awaiting Approval", approved: "Approved", rejected: "Rejected",
  in_progress: "In Progress", completed: "Completed",
};

export const changeRequestFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  impact: z.string(),
  status: z.string(),
  estimateHours: z.string(),
  budgetRs: z.string(),
  timelineDays: z.string(),
  approvalOwnerId: z.string(),
  decisionComment: z.string(),
});

export type ChangeRequestFormValues = z.infer<typeof changeRequestFormSchema>;

export const CHANGE_REQUEST_FORM_DEFAULTS: ChangeRequestFormValues = {
  title: "", description: "", impact: "", status: "submitted",
  estimateHours: "", budgetRs: "", timelineDays: "", approvalOwnerId: "none", decisionComment: "",
};
