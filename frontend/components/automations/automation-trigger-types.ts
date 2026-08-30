import type { AutomationTrigger } from "@/hooks/api/automations";

export type TriggerModule = "crm" | "support" | "finance" | "hr";

export interface TriggerMeta {
  value: AutomationTrigger;
  label: string;
  description: string;
  module: TriggerModule;
  fields: { value: string; label: string }[];
  samplePayload: Record<string, unknown>;
}
