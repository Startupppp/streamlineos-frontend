import type { WizardData } from "./types";

export const TOTAL_STEPS = 5;
export const DRAFT_KEY = "org-setup-draft";

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
  "Loading sample dashboard",
  "Creating workflows",
  "Installing recommended apps",
];

export const STEP_TITLES: readonly string[] = [
  "Welcome",
  "Business Goals",
  "Industry",
  "Company Profile",
  "Building Your Workspace",
];

export const DEFAULT_DATA: WizardData = {
  goals: [],
  industry: "",
  companyName: "",
  teamSize: "",
  installedApps: DEFAULT_APPS,
};
