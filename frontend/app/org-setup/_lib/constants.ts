import type { WizardData } from "./types";

export const TOTAL_STEPS = 10;
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

export const APP_SUITES = [
  { id: "CRM", label: "Sales Suite", description: "Leads, deals, contacts, pipeline" },
  { id: "HR", label: "People Suite", description: "Employees, leaves, payroll, onboarding" },
  { id: "PROJECTS", label: "Operations Suite", description: "Tasks, sprints, milestones" },
  { id: "FINANCE", label: "Finance Suite", description: "Expenses, invoices, accounting" },
  { id: "INVENTORY", label: "Inventory", description: "Assets, stock, warehouses" },
  { id: "HELPDESK", label: "Helpdesk", description: "Support tickets and SLA" },
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

export const IMPORT_TYPES = [
  { id: "customers", label: "Customers" },
  { id: "employees", label: "Employees" },
  { id: "inventory", label: "Inventory" },
  { id: "projects", label: "Projects" },
] as const;

export const STEP_TITLES: readonly string[] = [
  "Welcome",
  "Business Goals",
  "Industry",
  "Company Profile",
  "Building Your Workspace",
  "Recommended Apps",
  "Invite Team",
  "Import Data",
  "AI Personalization",
  "Workspace Ready",
];

export const NEXT_ACTIONS: readonly string[] = [
  "Invite first teammate",
  "Create first record",
  "Complete profile",
  "Try AI Assistant",
];

export const DEFAULT_DATA: WizardData = {
  goals: [],
  industry: "",
  companyName: "",
  teamSize: "",
  installedApps: ["CRM", "HR", "PROJECTS"],
  invitees: [],
};
