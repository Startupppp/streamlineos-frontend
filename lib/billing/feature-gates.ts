export const PLANS = ["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"] as const;
export type Plan = (typeof PLANS)[number];

export const FEATURES = [
  "ai.lead-scoring",
  "ai.email-drafting",
  "ai.enrichment",
  "ai.churn-risk",
  "ai.attrition-risk",
  "ai.next-action",
  "ai.deal-prediction",
  "ai.deal-summary",
  "ai.candidate-scoring",
  "ai.review-generation",
  "ai.reply-suggestion",
  "hr.payroll",
  "hr.performance-reviews",
  "hr.recruitment-ats",
  "crm.advanced-reports",
  "crm.custom-fields",
  "crm.sla-tracking",
  "crm.web-forms",
  "projects.advanced",
  "integrations.google",
  "integrations.zapier",
  "branches.multi-location",
  "branding.custom",
  "rbac.custom-roles",
  "audit-log.full",
] as const;

export type Feature = (typeof FEATURES)[number];

const PLAN_FEATURES: Record<Plan, ReadonlySet<Feature>> = {
  FREE: new Set<Feature>([]),
  STARTER: new Set<Feature>([
    "hr.payroll",
    "crm.advanced-reports",
    "crm.custom-fields",
  ]),
  PROFESSIONAL: new Set<Feature>([
    "ai.lead-scoring",
    "ai.email-drafting",
    "ai.next-action",
    "ai.enrichment",
    "ai.churn-risk",
    "ai.attrition-risk",
    "ai.deal-prediction",
    "ai.deal-summary",
    "ai.candidate-scoring",
    "ai.review-generation",
    "ai.reply-suggestion",
    "hr.payroll",
    "hr.performance-reviews",
    "hr.recruitment-ats",
    "crm.advanced-reports",
    "crm.custom-fields",
    "crm.sla-tracking",
    "crm.web-forms",
    "projects.advanced",
    "integrations.google",
    "audit-log.full",
  ]),
  ENTERPRISE: new Set<Feature>(FEATURES),
};

export function canUseFeature(plan: Plan | null | undefined, feature: Feature): boolean {
  if (!plan) return false;
  return PLAN_FEATURES[plan]?.has(feature) ?? false;
}

export function planRank(plan: Plan): number {
  return PLANS.indexOf(plan);
}

export function meetsPlan(currentPlan: Plan | null | undefined, requiredPlan: Plan): boolean {
  if (!currentPlan) return false;
  return planRank(currentPlan) >= planRank(requiredPlan);
}

export function minPlanFor(feature: Feature): Plan | null {
  for (const plan of PLANS) {
    if (PLAN_FEATURES[plan].has(feature)) return plan;
  }
  return null;
}
