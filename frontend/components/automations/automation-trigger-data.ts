import {
  AUTOMATION_TRIGGER_MODULE,
  type AutomationTrigger,
  type TriggerModule,
} from "@/lib/automations/automation-triggers";
import type { TriggerMeta } from "./automation-trigger-types";
import { CRM_TRIGGER_META } from "./automation-trigger-data-crm";
import { SUPPORT_TRIGGER_META } from "./automation-trigger-data-support";
import { FINANCE_TRIGGER_META } from "./automation-trigger-data-finance";
import { HR_RECRUITMENT_TRIGGER_META } from "./automation-trigger-data-hr-recruitment";
import { HR_EMPLOYEE_TRIGGER_META } from "./automation-trigger-data-hr-employee";
import { HR_SPEND_TRIGGER_META } from "./automation-trigger-data-hr-spend";
import { SIGN_TRIGGER_META } from "./automation-trigger-data-sign";

export type { TriggerModule, TriggerMeta } from "./automation-trigger-types";

export const TRIGGER_META: TriggerMeta[] = [
  ...CRM_TRIGGER_META,
  ...SUPPORT_TRIGGER_META,
  ...FINANCE_TRIGGER_META,
  ...HR_RECRUITMENT_TRIGGER_META,
  ...HR_EMPLOYEE_TRIGGER_META,
  ...HR_SPEND_TRIGGER_META,
  ...SIGN_TRIGGER_META,
];

export const NON_CRM_TRIGGER_META = TRIGGER_META.filter((t) => t.module !== "crm");

const META_BY_TRIGGER = new Map(TRIGGER_META.map((meta) => [meta.value, meta]));

/**
 * A Map rather than an index into the record: a `string` cannot index
 * `Record<AutomationTrigger, TriggerModule>` without forcing the type, and a
 * widened index signature would resolve `"toString"` to the inherited
 * prototype method instead of null.
 */
const MODULE_BY_TRIGGER = new Map<string, TriggerModule>(
  Object.entries(AUTOMATION_TRIGGER_MODULE),
);

export function resolveTriggerModule(trigger: string): TriggerModule | null {
  return MODULE_BY_TRIGGER.get(trigger) ?? null;
}

export function getTriggerMeta(trigger: AutomationTrigger): TriggerMeta {
  const meta = META_BY_TRIGGER.get(trigger);
  if (meta) return meta;
  return {
    value: trigger,
    label: trigger,
    description: "",
    module: AUTOMATION_TRIGGER_MODULE[trigger],
    fields: [],
    samplePayload: {},
  };
}
