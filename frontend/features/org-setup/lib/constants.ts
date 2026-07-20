import type { WizardData } from "./types";

export const DRAFT_KEY = "org-setup-draft";

const COMMERCE_GOALS = new Set(["sales", "finance", "everything"]);

export function needsPaymentsStep(goals: string[]): boolean {
  return goals.some((g) => COMMERCE_GOALS.has(g));
}

export type StepId = "welcome" | "basics" | "setup" | "invite";

export function getStepSequence(_goals: string[]): StepId[] {
  return ["welcome", "basics", "setup", "invite"];
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

export const DEFAULT_APPS = ["CRM", "HR", "PROJECTS"];

export function deriveAppsFromGoals(goals: string[]): string[] {
  if (goals.length === 0) return DEFAULT_APPS;
  const apps = new Set<string>();
  for (const g of goals) {
    for (const app of (GOAL_TO_APPS[g] ?? [])) {
      apps.add(app);
    }
  }
  return apps.size > 0 ? Array.from(apps) : DEFAULT_APPS;
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
  "Preparing payment setup",
  "Sending invites",
];

export const STEP_TITLES: Record<StepId, string> = {
  welcome: "Welcome",
  basics: "Basics",
  setup: "Modules",
  invite: "Launch",
};

export const STEP_SUBTITLES: Record<StepId, string> = {
  welcome: "Let's get your workspace ready to run your business.",
  basics: "Your goals, industry, and company — the essentials only.",
  setup: "Confirm what to enable. Nothing here is permanent.",
  invite: "Bring your team in, then build your workspace.",
};

export const ESTIMATED_MINUTES_REMAINING: Record<StepId, number> = {
  welcome: 3,
  basics: 2,
  setup: 1,
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

export const STARTING_DATA_OPTIONS: { id: WizardData["startingData"]; label: string; description: string; nextStep: string }[] = [
  { id: "clean", label: "Start clean", description: "No sample data — build from scratch", nextStep: "Your workspace opens empty and ready to fill in." },
  { id: "sample", label: "Use sample data", description: "Lightweight demo data you can delete anytime", nextStep: "We'll add sample contacts, products, and tasks so you can explore." },
  { id: "import", label: "Import data", description: "Bring in contacts, employees, or products after setup", nextStep: "You'll be guided to import screens right after workspace generation." },
];

export const PAYMENT_PROVIDER_OPTIONS: { id: NonNullable<WizardData["paymentsChoice"]>; label: string; description: string }[] = [
  { id: "razorpay", label: "Razorpay", description: "Cards, UPI, net banking — recommended for India" },
  { id: "stripe", label: "Stripe", description: "Cards and global payment methods" },
  { id: "manual", label: "Manual / Bank Transfer", description: "Record offline payments — no live processing" },
  { id: "skip", label: "Skip for now", description: "Connect payments later from Settings" },
];

export const INVITE_ROLES = ["ADMIN", "HR", "SALES", "ENGINEERING"] as const;

export const DEFAULT_DATA: WizardData = {
  goals: [],
  industry: "",
  companyName: "",
  teamSize: "",
  phone: "",
  installedApps: DEFAULT_APPS,
  modules: DEFAULT_APPS,
  startingData: "clean",
  invitees: [],
};
