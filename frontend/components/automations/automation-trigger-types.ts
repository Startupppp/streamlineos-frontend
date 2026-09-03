import type { AutomationTrigger, TriggerModule } from "@/lib/automations/automation-triggers";

export type { TriggerModule };

export interface TriggerMeta {
  value: AutomationTrigger;
  label: string;
  description: string;
  module: TriggerModule;
  fields: { value: string; label: string }[];
  samplePayload: Record<string, unknown>;
}
