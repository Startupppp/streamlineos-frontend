import type { AutomationTrigger } from "@/hooks/api/automations";
import type { TriggerMeta, TriggerModule } from "./automation-trigger-types";
import { CRM_TRIGGER_META } from "./automation-trigger-data-crm";
import { SUPPORT_TRIGGER_META } from "./automation-trigger-data-support";
import { FINANCE_TRIGGER_META } from "./automation-trigger-data-finance";
import { HR_RECRUITMENT_TRIGGER_META } from "./automation-trigger-data-hr-recruitment";
import { HR_EMPLOYEE_TRIGGER_META } from "./automation-trigger-data-hr-employee";

export type { TriggerModule, TriggerMeta } from "./automation-trigger-types";

export const TRIGGER_META: TriggerMeta[] = [
  ...CRM_TRIGGER_META,
  ...SUPPORT_TRIGGER_META,
  ...FINANCE_TRIGGER_META,
  ...HR_RECRUITMENT_TRIGGER_META,
  ...HR_EMPLOYEE_TRIGGER_META,
];

export const NON_CRM_TRIGGER_META = TRIGGER_META.filter((t) => t.module !== "crm");

export function getModuleForTrigger(trigger: AutomationTrigger): TriggerModule {
  const entry = TRIGGER_META.find((t) => t.value === trigger);
  return entry?.module ?? "hr";
}

export function getTriggerMeta(trigger: AutomationTrigger): TriggerMeta {
  return TRIGGER_META.find((t) => t.value === trigger) ?? TRIGGER_META[0];
}
