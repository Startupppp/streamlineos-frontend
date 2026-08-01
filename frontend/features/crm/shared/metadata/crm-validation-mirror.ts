import type { CrmValidationRule } from "@/types/crm/metadata";

export interface ValidationContext {
  stageKey?: string | null;
  sourceKey?: string | null;
  pipelineId?: string | null;
}

function isRuleApplicable(rule: CrmValidationRule, ctx: ValidationContext): boolean {
  if (!rule.isActive) return false;
  if (rule.pipelineId && rule.pipelineId !== ctx.pipelineId) return false;
  if (rule.stageKey && rule.stageKey !== ctx.stageKey) return false;
  if (rule.sourceKey && rule.sourceKey !== ctx.sourceKey) return false;
  return true;
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function validateRule(
  rule: CrmValidationRule,
  value: unknown,
  values: Record<string, unknown>
): string | null {
  const errorMsg = rule.errorMessage ?? defaultErrorMessage(rule);

  switch (rule.ruleType) {
    case "required":
      return isEmpty(value) ? errorMsg : null;

    case "email": {
      if (isEmpty(value)) return null;
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return typeof value === "string" && emailPattern.test(value) ? null : errorMsg;
    }

    case "phone": {
      if (isEmpty(value)) return null;
      const phonePattern = /^\+?[\d\s\-().]{7,20}$/;
      return typeof value === "string" && phonePattern.test(value) ? null : errorMsg;
    }

    case "url": {
      if (isEmpty(value)) return null;
      try {
        new URL(typeof value === "string" ? value : String(value));
        return null;
      } catch {
        return errorMsg;
      }
    }

    case "regex": {
      if (isEmpty(value)) return null;
      const pattern = rule.config?.["pattern"];
      if (typeof pattern !== "string") return null;
      try {
        return new RegExp(pattern).test(String(value)) ? null : errorMsg;
      } catch {
        return null;
      }
    }

    case "numeric_min": {
      if (isEmpty(value)) return null;
      const min = rule.config?.["min"];
      if (typeof min !== "number") return null;
      return Number(value) >= min ? null : errorMsg;
    }

    case "numeric_max": {
      if (isEmpty(value)) return null;
      const max = rule.config?.["max"];
      if (typeof max !== "number") return null;
      return Number(value) <= max ? null : errorMsg;
    }

    case "currency_min": {
      if (isEmpty(value)) return null;
      const cmin = rule.config?.["min"];
      if (typeof cmin !== "number") return null;
      return Number(value) >= cmin ? null : errorMsg;
    }

    case "currency_max": {
      if (isEmpty(value)) return null;
      const cmax = rule.config?.["max"];
      if (typeof cmax !== "number") return null;
      return Number(value) <= cmax ? null : errorMsg;
    }

    case "date_not_past": {
      if (isEmpty(value)) return null;
      const d = new Date(String(value));
      if (isNaN(d.getTime())) return errorMsg;
      return d >= new Date() ? null : errorMsg;
    }

    case "date_not_future": {
      if (isEmpty(value)) return null;
      const d2 = new Date(String(value));
      if (isNaN(d2.getTime())) return errorMsg;
      return d2 <= new Date() ? null : errorMsg;
    }

    case "unique":
      return null;

    case "conditional_required": {
      const condField = rule.config?.["conditionField"];
      const condValue = rule.config?.["conditionValue"];
      if (typeof condField !== "string") return null;
      if (values[condField] !== condValue) return null;
      return isEmpty(value) ? errorMsg : null;
    }

    case "stage_required":
      return isEmpty(value) ? errorMsg : null;

    case "source_required":
      return isEmpty(value) ? errorMsg : null;

    default:
      return null;
  }
}

function defaultErrorMessage(rule: CrmValidationRule): string {
  switch (rule.ruleType) {
    case "required":
    case "stage_required":
    case "source_required":
    case "conditional_required":
      return `${rule.field} is required`;
    case "email":
      return `${rule.field} must be a valid email`;
    case "phone":
      return `${rule.field} must be a valid phone number`;
    case "url":
      return `${rule.field} must be a valid URL`;
    case "regex":
      return `${rule.field} format is invalid`;
    case "numeric_min":
    case "currency_min":
      return `${rule.field} is below the minimum allowed value`;
    case "numeric_max":
    case "currency_max":
      return `${rule.field} exceeds the maximum allowed value`;
    case "date_not_past":
      return `${rule.field} cannot be in the past`;
    case "date_not_future":
      return `${rule.field} cannot be in the future`;
    default:
      return `${rule.field} is invalid`;
  }
}

export function buildFieldErrors(
  rules: CrmValidationRule[],
  values: Record<string, unknown>,
  ctx: ValidationContext
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const rule of rules) {
    if (!isRuleApplicable(rule, ctx)) continue;
    if (rule.field in errors) continue;
    const result = validateRule(rule, values[rule.field], values);
    if (result !== null) {
      errors[rule.field] = result;
    }
  }

  return errors;
}

