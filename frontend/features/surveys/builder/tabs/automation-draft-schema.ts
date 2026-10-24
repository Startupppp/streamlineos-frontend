import { z } from "zod";
import type {
  AutomationActionType,
  AutomationEventType,
} from "@/hooks/api/surveys/automations";

export const AUTOMATION_EVENT_TYPES = [
  "survey.published",
  "survey.response.started",
  "survey.response.submitted",
  "survey.assessment.passed",
  "survey.assessment.failed",
  "survey.live.started",
  "survey.live.ended",
  "survey.lead.created",
  "survey.collector.completed_quota",
] as const satisfies readonly AutomationEventType[];

export const AUTOMATION_ACTION_TYPES = [
  "create_lead",
  "update_lead",
  "notify_owner",
  "webhook",
] as const satisfies readonly AutomationActionType[];

export const EVENT_LABELS: Record<AutomationEventType, string> = {
  "survey.published": "Survey published",
  "survey.response.started": "Response started",
  "survey.response.submitted": "Response submitted",
  "survey.assessment.passed": "Assessment passed",
  "survey.assessment.failed": "Assessment failed",
  "survey.live.started": "Live session started",
  "survey.live.ended": "Live session ended",
  "survey.lead.created": "Lead created",
  "survey.collector.completed_quota": "Collector reached quota",
};

export const ACTION_LABELS: Record<AutomationActionType, string> = {
  create_lead: "Create CRM lead",
  update_lead: "Update matching CRM lead",
  notify_owner: "Notify survey owner",
  webhook: "Trigger webhook",
};

export const SCORE_AWARE_ACTIONS = new Set<AutomationActionType>([
  "create_lead",
  "update_lead",
  "notify_owner",
]);

export const automationDraftSchema = z.object({
  eventType: z.enum(AUTOMATION_EVENT_TYPES),
  actionType: z.enum(AUTOMATION_ACTION_TYPES),
  scoreThreshold: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Number(value)), {
      message: "Enter a number",
    }),
  createFollowUpTask: z.boolean(),
});

export type AutomationDraftValues = z.infer<typeof automationDraftSchema>;

export const AUTOMATION_DRAFT_DEFAULTS: AutomationDraftValues = {
  eventType: "survey.response.submitted",
  actionType: "create_lead",
  scoreThreshold: "",
  createFollowUpTask: false,
};
