import type { Plan } from "./feature-gates";

const MODULES = [
  "self",
  "dashboard",
  "hr",
  "crm",
  "projects",
  "reports",
  "settings",
  "ai",
  "branch",
  "chat",
  "billing",
  "support",
  "kb",
  "accounting",
] as const;

export type Module = (typeof MODULES)[number];

const PLAN_MODULES: Record<Plan, ReadonlySet<Module>> = {
  FREE: new Set<Module>(["self", "dashboard"]),
  STARTER: new Set<Module>(["self", "dashboard", "hr", "chat"]),
  PROFESSIONAL: new Set<Module>([
    "self",
    "dashboard",
    "hr",
    "crm",
    "projects",
    "reports",
    "chat",
    "ai",
    "accounting",
    "kb",
  ]),
  ENTERPRISE: new Set<Module>(MODULES),
};

function getEnabledModulesForPlan(plan: Plan | null | undefined): ReadonlySet<Module> {
  if (!plan) return PLAN_MODULES.FREE;
  return PLAN_MODULES[plan] ?? PLAN_MODULES.FREE;
}

export function resolveEnabledModules(
  plan: Plan | null | undefined,
  orgOverride: readonly string[] | null | undefined,
): readonly Module[] {
  const planModules = getEnabledModulesForPlan(plan);
  if (orgOverride && orgOverride.length > 0) {
    return orgOverride.filter((m): m is Module => planModules.has(m as Module));
  }
  return [...planModules];
}

