/**
 * Frontend plan feature gates — MUST stay aligned with backend
 * `src/modules/ai/billing/feature-gates.ts`. Backend `requireFeature` is the
 * enforcement authority; this matrix is only for upgrade CTAs and UI hiding.
 *
 * Consistency is covered by `lib/__tests__/feature-gates-consistency.test.ts`.
 */

const PLANS = ["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"] as const;
export type Plan = (typeof PLANS)[number];

const FEATURES = [
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
  "ai.project-manager",
  "ai.ticket-insights",
  "ai.feedbucket",
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
  // KB / portal extras (frontend UX only; server still enforces PLAN_FEATURE_FLAGS.kbPublicSharing)
  "kb.public-portal",
  "kb.ai",
  "kb.multi-space",
  "kb.analytics",
  "kb.multilingual",
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
    "ai.project-manager",
    "ai.ticket-insights",
    "ai.feedbucket",
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
    "kb.public-portal",
    "kb.ai",
    "kb.multi-space",
    "kb.analytics",
  ]),
  ENTERPRISE: new Set<Feature>(FEATURES),
};

export function canUseFeature(plan: Plan | null | undefined, feature: Feature): boolean {
  if (!plan) return false;
  return PLAN_FEATURES[plan]?.has(feature) ?? false;
}

export function minPlanFor(feature: Feature): Plan | null {
  for (const plan of PLANS) {
    if (PLAN_FEATURES[plan].has(feature)) return plan;
  }
  return null;
}

/** Human labels for upgrade messages. */
export const PLAN_DISPLAY_NAMES: Record<Plan, string> = {
  FREE: "Free",
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

export function upgradeMessageFor(feature: Feature): string {
  const required = minPlanFor(feature);
  if (!required) return "This feature is not available on your plan.";
  return `This feature requires the ${PLAN_DISPLAY_NAMES[required]} plan or higher. Upgrade to unlock it.`;
}
