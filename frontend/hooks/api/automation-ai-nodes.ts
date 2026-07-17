import type { AutomationAction, AutomationActionType } from "@/hooks/api/automations";

export interface AiClassifyAction {
  type: "ai_classify";
  config: { labels: string[]; field: string };
}

export interface AiSummarizeAction {
  type: "ai_summarize";
  config: { fields: string[] };
}

export interface AiExtractField {
  name: string;
  description: string;
  type: "string" | "number" | "boolean";
}

export interface AiExtractAction {
  type: "ai_extract";
  config: { fields: AiExtractField[] };
}

export interface AiRoutingSuggestionAction {
  type: "ai_routing_suggestion";
  config: { options: string[]; field: string };
}

export type AiAutomationAction =
  | AiClassifyAction
  | AiSummarizeAction
  | AiExtractAction
  | AiRoutingSuggestionAction;

export type AiAutomationActionType = AiAutomationAction["type"];

export type ExtendedAutomationAction = AutomationAction | AiAutomationAction;

export type ExtendedAutomationActionType = AutomationActionType | AiAutomationActionType;
