import { z } from "zod";
import type {
  LogicActionType,
  LogicConditionOp,
} from "@/hooks/api/surveys/logic";

export const CONDITION_OPS = [
  "answer_equals",
  "answer_contains",
  "score_gt",
  "score_lt",
  "metadata_equals",
  "collector_equals",
  "contact_field_equals",
  "completion_status_equals",
] as const satisfies readonly LogicConditionOp[];

export const ACTION_TYPES = [
  "skip_to_question",
  "skip_to_section",
  "show_question",
  "hide_question",
  "disqualify",
  "end_survey",
  "assign_score",
  "assign_segment",
  "create_lead",
  "send_notification",
  "set_variable",
] as const satisfies readonly LogicActionType[];

export const CONDITION_LABELS: Record<LogicConditionOp, string> = {
  answer_equals: "Answer equals",
  answer_contains: "Answer contains",
  score_gt: "Score is greater than",
  score_lt: "Score is less than",
  metadata_equals: "Metadata equals",
  collector_equals: "Collector equals",
  contact_field_equals: "Contact field equals",
  completion_status_equals: "Completion status equals",
};

export const ACTION_LABELS: Record<LogicActionType, string> = {
  skip_to_question: "Skip to question",
  skip_to_section: "Skip to section",
  show_question: "Show question",
  hide_question: "Hide question",
  disqualify: "Disqualify respondent",
  end_survey: "End survey",
  assign_score: "Assign score",
  assign_segment: "Assign segment",
  create_lead: "Create CRM lead",
  send_notification: "Send notification",
  set_variable: "Set variable",
};

export const QUESTION_TARGET_ACTIONS = new Set<LogicActionType>([
  "skip_to_question",
  "show_question",
  "hide_question",
]);

export const logicRuleDraftSchema = z
  .object({
    op: z.enum(CONDITION_OPS),
    conditionValue: z.string().min(1, "Value is required"),
    actionType: z.enum(ACTION_TYPES),
    targetQuestionId: z.string(),
    targetSectionId: z.string(),
  })
  .superRefine((values, ctx) => {
    if (
      QUESTION_TARGET_ACTIONS.has(values.actionType) &&
      !values.targetQuestionId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pick a target question",
        path: ["targetQuestionId"],
      });
    }
    if (values.actionType === "skip_to_section" && !values.targetSectionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pick a target section",
        path: ["targetSectionId"],
      });
    }
  });

export type LogicRuleDraftValues = z.infer<typeof logicRuleDraftSchema>;

export const LOGIC_RULE_DRAFT_DEFAULTS: LogicRuleDraftValues = {
  op: "answer_equals",
  conditionValue: "",
  actionType: "skip_to_question",
  targetQuestionId: "",
  targetSectionId: "",
};
