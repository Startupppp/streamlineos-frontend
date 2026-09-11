import type { RecordFormValues } from "@/features/renderer";
import type {
  CrmValidationEntityType,
  CrmValidationRule,
  CrmValidationRuleType,
} from "@/types/crm/metadata";
import { numberOrOmit, textOrOmit } from "./shared/record-payload";

const RULE_TYPES: readonly CrmValidationRuleType[] = [
  "required",
  "unique",
  "email",
  "phone",
  "url",
  "regex",
  "numeric_min",
  "numeric_max",
  "currency_min",
  "currency_max",
  "date_not_past",
  "date_not_future",
  "conditional_required",
  "stage_required",
  "source_required",
];

const ENTITY_TYPES: readonly CrmValidationEntityType[] = [
  "lead",
  "deal",
  "contact",
  "company",
  "quote",
];

const NUMERIC_RULES: readonly CrmValidationRuleType[] = [
  "numeric_min",
  "numeric_max",
  "currency_min",
  "currency_max",
];

export function toRuleType(value: string | undefined): CrmValidationRuleType | undefined {
  return RULE_TYPES.find((candidate) => candidate === value);
}

export function toEntityType(value: string | undefined): CrmValidationEntityType | undefined {
  return ENTITY_TYPES.find((candidate) => candidate === value);
}

/**
 * The stored `config` blob, built from the arm the rule is on.
 *
 * The engine has already dropped every value belonging to another arm, so this
 * only has to say which shape each arm stores. A rule with no configuration
 * stores `null` rather than `{}` — an empty object reads as "configured with
 * nothing", which is a different claim.
 */
export function configFor(
  ruleType: CrmValidationRuleType,
  values: RecordFormValues,
): Record<string, unknown> | null {
  if (ruleType === "regex") {
    const pattern = textOrOmit(values, "configPattern");
    return pattern ? { pattern } : null;
  }

  if (NUMERIC_RULES.includes(ruleType)) {
    const value = numberOrOmit(values, "configValue");
    return value === undefined ? null : { value };
  }

  if (ruleType === "conditional_required")
    return {
      condition_field: textOrOmit(values, "configConditionField") ?? "",
      condition_value: textOrOmit(values, "configConditionValue") ?? "",
    };

  return null;
}

/** The rule as the form's flat fields, with `config` spread back out. */
export function initialValues(rule: CrmValidationRule, pipelineName: string): Record<string, unknown> {
  const config = rule.config ?? {};
  return {
    entityType: rule.entityType,
    field: rule.field,
    ruleType: rule.ruleType,
    configPattern: typeof config.pattern === "string" ? config.pattern : "",
    configValue: config.value === undefined ? "" : String(config.value),
    configConditionField:
      typeof config.condition_field === "string" ? config.condition_field : "",
    configConditionValue:
      typeof config.condition_value === "string" ? config.condition_value : "",
    pipelineId: rule.pipelineId ?? "",
    pipelineName,
    stageKey: rule.stageKey ?? "",
    sourceKey: rule.sourceKey ?? "",
    errorMessage: rule.errorMessage ?? "",
    isActive: rule.isActive,
    sortOrder: rule.sortOrder,
  };
}
