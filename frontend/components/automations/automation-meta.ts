import type {
  AutomationActionType,
  AutomationConditionOp,
} from "@/hooks/api/automations";
import type { AiAutomationActionType } from "@/hooks/api/automation-ai-nodes";

export const CONDITION_OPS: { value: AutomationConditionOp; label: string }[] =
  [
    { value: "eq", label: "equals" },
    { value: "neq", label: "not equals" },
    { value: "contains", label: "contains" },
    { value: "gt", label: "greater than" },
    { value: "lt", label: "less than" },
    { value: "exists", label: "exists" },
  ];

export const ACTION_TYPES: {
  value: AutomationActionType | AiAutomationActionType;
  label: string;
  description: string;
}[] = [
  {
    value: "notify_roles",
    label: "Notify roles",
    description: "In-app notification to members with given roles",
  },
  {
    value: "notify_all",
    label: "Notify everyone",
    description: "In-app notification to all org members",
  },
  {
    value: "email",
    label: "Send email",
    description: "Send an email to a fixed address",
  },
  {
    value: "create_task",
    label: "Create task",
    description: "Create a follow-up task",
  },
  {
    value: "webhook",
    label: "Fire webhook",
    description: "Dispatch an outbound webhook event",
  },
  {
    value: "support_assign_ticket",
    label: "Assign ticket",
    description: "Assign the support ticket to an agent",
  },
  {
    value: "support_set_priority",
    label: "Set ticket priority",
    description: "Change the support ticket's priority",
  },
  {
    value: "support_add_tag",
    label: "Add ticket tag",
    description: "Attach a tag to the support ticket",
  },
  {
    value: "support_internal_note",
    label: "Add internal note",
    description: "Post a system-authored internal note on the ticket",
  },
  {
    value: "ai_classify",
    label: "AI: Classify",
    description: "Use AI to classify the event into one of your configured labels",
  },
  {
    value: "ai_summarize",
    label: "AI: Summarize",
    description: "Use AI to generate a summary from selected event fields",
  },
  {
    value: "ai_extract",
    label: "AI: Extract fields",
    description: "Use AI to extract structured data from the event payload",
  },
  {
    value: "ai_routing_suggestion",
    label: "AI: Routing suggestion",
    description: "Use AI to suggest a route/assignee (requires human approval before acting)",
  },
];
