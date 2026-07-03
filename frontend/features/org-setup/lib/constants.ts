import type { WizardData } from "./types";

export const DRAFT_KEY = "org-setup-draft";

// Payments step only appears when the owner picked a commerce-ish goal — matches
// PRD 04_UI_UX_Every_Screen.md "Payments Step: show only when user selected commerce,
// invoices, accounting, subscriptions, ecommerce, sales, or online payments".
const COMMERCE_GOALS = new Set(["sales", "finance", "everything"]);

export function needsPaymentsStep(goals: string[]): boolean {
  return goals.some((g) => COMMERCE_GOALS.has(g));
}

export type StepId =
  | "welcome"
  | "goals"
  | "industry"
  | "company"
  | "modules"
  | "starting-data"
  | "payments"
  | "invite"
  | "generation";

export function getStepSequence(goals: string[]): StepId[] {
  return [
    "welcome",
    "goals",
    "industry",
    "company",
    "modules",
    "starting-data",
    ...(needsPaymentsStep(goals) ? (["payments"] as const) : []),
    "invite",
    "generation",
  ];
}

export const GOALS = [
  { id: "sales", label: "Grow Sales" },
  { id: "hr", label: "Manage Employees" },
  { id: "inventory", label: "Manage Inventory" },
  { id: "finance", label: "Finance & Accounting" },
  { id: "support", label: "Customer Support" },
  { id: "projects", label: "Projects" },
  { id: "ai", label: "AI Automation" },
  { id: "everything", label: "Build Everything" },
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

export const TEAM_SIZES = [
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "500+", label: "500+ employees" },
] as const;

export const GENERATION_STEPS: readonly string[] = [
  "Creating organization",
  "Setting up departments",
  "Building teams",
  "Configuring roles",
  "Enabling modules",
  "Preparing setup checklist",
  "Sending invites",
];

export const STEP_TITLES: Record<StepId, string> = {
  welcome: "Welcome",
  goals: "Business Goals",
  industry: "Industry",
  company: "Company Profile",
  modules: "Recommended Modules",
  "starting-data": "Starting Data",
  payments: "Payments",
  invite: "Invite Your Team",
  generation: "Building Your Workspace",
};

export const MODULE_CATALOG: Record<string, { label: string; description: string }> = {
  CRM: { label: "CRM", description: "Pipeline, leads, and deals" },
  HR: { label: "HR", description: "Employees, leave, and payroll" },
  INVENTORY: { label: "Inventory", description: "Stock, warehouses, and products" },
  FINANCE: { label: "Accounting", description: "Invoices, taxes, and reports" },
  PROJECTS: { label: "Projects", description: "Tasks and delivery tracking" },
  HELPDESK: { label: "Support", description: "Tickets and customer SLAs" },
  KNOWLEDGE: { label: "Knowledge", description: "SOPs and team docs" },
  CHAT: { label: "Chat", description: "Team messaging" },
};

export const STARTING_DATA_OPTIONS: { id: WizardData["startingData"]; label: string; description: string }[] = [
  { id: "clean", label: "Start clean", description: "No sample data — build from scratch" },
  { id: "sample", label: "Use sample data", description: "Lightweight demo data you can delete anytime" },
  { id: "import", label: "Import data", description: "Bring in contacts, employees, or products after setup" },
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
  installedApps: DEFAULT_APPS,
  modules: DEFAULT_APPS,
  startingData: "clean",
  invitees: [],
};
