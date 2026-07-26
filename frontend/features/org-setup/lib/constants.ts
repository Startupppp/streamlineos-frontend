import type { WizardData } from "./wizard-data-schema";
import {
  WIZARD_COL_PAD,
  WIZARD_COL_PAD_X,
  WIZARD_COL_PAD_Y,
} from "@/components/wizard-shell";

export const DRAFT_KEY = "org-setup-draft";

export const ORG_SETUP_COL_PAD_X = WIZARD_COL_PAD_X;
export const ORG_SETUP_COL_PAD_Y = WIZARD_COL_PAD_Y;
export const ORG_SETUP_COL_PAD = WIZARD_COL_PAD;

export type StepId = "welcome" | "basics" | "invite";

export function getStepSequence(_goals: string[]): StepId[] {
  return ["welcome", "basics", "invite"];
}

export function resolveStepIndex(
  stepId: string | null | undefined,
  sequence: StepId[],
): number {
  if (!stepId) return 0;
  if (stepId === "setup") {
    const inviteIdx = sequence.indexOf("invite");
    return inviteIdx >= 0 ? inviteIdx + 1 : 0;
  }
  const idx = sequence.findIndex((id) => id === stepId);
  return idx >= 0 ? idx + 1 : 0;
}

export const GOALS = [
  { id: "sales", label: "Grow Sales", outcome: "Track leads and close more deals" },
  { id: "hr", label: "Manage Employees", outcome: "Run HR, leave, and payroll in one place" },
  { id: "inventory", label: "Manage Inventory", outcome: "Track stock across warehouses" },
  { id: "finance", label: "Finance & Accounting", outcome: "Invoice, reconcile, and get paid faster" },
  { id: "support", label: "Customer Support", outcome: "Resolve tickets with SLAs" },
  { id: "projects", label: "Projects", outcome: "Plan and deliver work on time" },
  { id: "ai", label: "AI Automation", outcome: "Automate busywork across your team" },
  { id: "everything", label: "Build Everything", outcome: "Enable the full StreamlineOS suite" },
] as const;

export const EVERYTHING_GOAL_ID = "everything";

export const ALL_GOAL_IDS: readonly string[] = GOALS.map((g) => g.id);

export const GOAL_TO_APPS: Record<string, string[]> = {
  sales: ["CRM"],
  hr: ["HR"],
  inventory: ["INVENTORY"],
  finance: ["FINANCE"],
  support: ["HELPDESK"],
  projects: ["PROJECTS"],
  ai: ["CRM", "HR", "PROJECTS"],
  everything: ["CRM", "HR", "PROJECTS", "FINANCE", "INVENTORY", "HELPDESK"],
};

export const ALWAYS_ENABLED_MODULES = ["CHAT", "KNOWLEDGE"] as const;

export const DEFAULT_APPS = ["CRM", "HR", "PROJECTS", ...ALWAYS_ENABLED_MODULES];

export function deriveAppsFromGoals(goals: string[]): string[] {
  if (goals.length === 0) return [...DEFAULT_APPS];
  const apps = new Set<string>(ALWAYS_ENABLED_MODULES);
  for (const g of goals) {
    for (const app of GOAL_TO_APPS[g] ?? []) {
      apps.add(app);
    }
  }
  if (apps.size === ALWAYS_ENABLED_MODULES.length) return [...DEFAULT_APPS];
  return Array.from(apps);
}

export function toggleGoalSelection(current: readonly string[], id: string): string[] {
  if (id === EVERYTHING_GOAL_ID) {
    const allSelected = ALL_GOAL_IDS.every((goalId) => current.includes(goalId));
    return allSelected ? [] : [...ALL_GOAL_IDS];
  }

  const has = current.includes(id);
  let next = has ? current.filter((goalId) => goalId !== id) : [...current, id];

  if (has) {
    next = next.filter((goalId) => goalId !== EVERYTHING_GOAL_ID);
  } else {
    const others = ALL_GOAL_IDS.filter((goalId) => goalId !== EVERYTHING_GOAL_ID);
    if (others.every((goalId) => next.includes(goalId)) && !next.includes(EVERYTHING_GOAL_ID)) {
      next = [...next, EVERYTHING_GOAL_ID];
    }
  }

  return next;
}

export const INDUSTRIES: readonly string[] = [
  "IT Services",
  "Agency",
  "Retail",
  "Manufacturing",
  "Healthcare",
  "Education",
  "Construction",
  "Real Estate",
  "Restaurant",
  "Logistics",
];

export const INDUSTRY_TEMPLATE_HINTS: Record<string, string> = {
  "IT Services": "Engineering, Product, Ops departments + delivery templates",
  "Agency": "Creative, Strategy, Client Services departments",
  "Retail": "Sales, Inventory, Customer Service departments",
  "Manufacturing": "Production, Quality, Supply Chain departments",
  "Healthcare": "Clinical, Administration, Compliance departments",
  "Education": "Academic, Administration, IT departments",
  "Construction": "Projects, Engineering, Safety departments",
  "Real Estate": "Sales, Leasing, Operations departments",
  "Restaurant": "Kitchen, Service, Management departments",
  "Logistics": "Operations, Fleet, Warehouse departments",
};

export const TEAM_SIZES = [
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "500+", label: "500+ employees" },
] as const;

export const GENERATION_STEPS: readonly string[] = [
  "Creating organization",
  "Applying industry template",
  "Enabling modules",
  "Creating defaults",
  "Preparing dashboard checklist",
  "Sending invites",
];

export const STEP_TITLES: Record<StepId, string> = {
  welcome: "Welcome",
  basics: "Basics",
  invite: "Launch",
};

export const STEP_SUBTITLES: Record<StepId, string> = {
  welcome: "Let's get your organization ready to run your business.",
  basics: "Goals unlock modules. Add industry and company, then launch.",
  invite: "Bring your team in, then build your organization.",
};

export const ESTIMATED_MINUTES_REMAINING: Record<StepId, number> = {
  welcome: 2,
  basics: 2,
  invite: 1,
};

export const MODULE_CATALOG: Record<string, { label: string; description: string; setupTasks: string[] }> = {
  CRM: { label: "CRM", description: "Pipeline, leads, and deals", setupTasks: ["Create first pipeline", "Import contacts"] },
  HR: { label: "HR", description: "Employees, leave, and payroll", setupTasks: ["Add departments", "Invite employees"] },
  INVENTORY: { label: "Inventory", description: "Stock, warehouses, and products", setupTasks: ["Create warehouse", "Import products"] },
  FINANCE: { label: "Accounting", description: "Invoices, taxes, and reports", setupTasks: ["Set fiscal year", "Configure taxes"] },
  PROJECTS: { label: "Projects", description: "Tasks and delivery tracking", setupTasks: ["Create first project", "Invite team"] },
  HELPDESK: { label: "Support", description: "Tickets and customer SLAs", setupTasks: ["Configure SLA policy"] },
  KNOWLEDGE: { label: "Knowledge", description: "SOPs and team docs", setupTasks: ["Create team space"] },
  CHAT: { label: "Chat", description: "Team messaging", setupTasks: ["Create first channel"] },
};

export const INVITE_ROLES = ["ADMIN", "HR", "SALES", "ENGINEERING"] as const;

export const DEFAULT_DATA: WizardData = {
  goals: [],
  industry: "",
  companyName: "",
  teamSize: "",
  phone: "",
  installedApps: DEFAULT_APPS,
  modules: DEFAULT_APPS,
  invitees: [],
};
