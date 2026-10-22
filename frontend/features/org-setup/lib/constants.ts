import { ORG_MODULE_KEYS, type OrgModuleKey, type WizardData } from "./wizard-data-schema";

export const DRAFT_KEY = "org-setup-draft";

export type StepId = "workspace" | "invite";

export function getStepSequence(): StepId[] {
  return ["workspace", "invite"];
}

export const GOALS = [
  { id: "sales", label: "Grow Sales", outcome: "Track leads and close more deals" },
  { id: "hr", label: "Manage Employees", outcome: "Run HR, leave, and payroll in one place" },
  { id: "inventory", label: "Manage Inventory", outcome: "Track stock across warehouses" },
  { id: "finance", label: "Finance & Accounting", outcome: "Invoice, reconcile, and get paid faster" },
  { id: "support", label: "Customer Support", outcome: "Resolve tickets with SLAs" },
  { id: "build", label: "Build", outcome: "Plan and deliver work on time" },
  { id: "ai", label: "AI Automation", outcome: "Automate busywork across your team" },
  { id: "everything", label: "Build Everything", outcome: "Enable the full StreamlineOS suite" },
] as const;

export const ALWAYS_ENABLED_MODULES = ["kb"] as const satisfies readonly OrgModuleKey[];

export const GENERATION_STEPS: readonly string[] = [
  "Creating organization",
  "Applying industry template",
  "Enabling modules",
  "Creating defaults",
  "Preparing dashboard checklist",
  "Sending invites",
];

export const STEP_SUBTITLES: Record<StepId, string> = {
  workspace: "Add your workspace name and contact details.",
  invite: "Invite your team — or skip and do it later.",
};

export const MODULE_CATALOG: Record<OrgModuleKey, { label: string; description: string; setupTasks: string[] }> = {
  crm: { label: "CRM", description: "Pipeline, leads, and deals", setupTasks: ["Create first pipeline", "Import contacts"] },
  hr: { label: "HR", description: "Employees, leave, and attendance", setupTasks: ["Add departments", "Invite employees"] },
  inventory: { label: "Inventory", description: "Stock, warehouses, and products", setupTasks: ["Create warehouse", "Import products"] },
  accounting: { label: "Accounting", description: "Invoices, taxes, and reports", setupTasks: ["Set fiscal year", "Configure taxes"] },
  build: { label: "Build", description: "Tasks and delivery tracking", setupTasks: ["Create first project", "Invite team"] },
  support: { label: "Support", description: "Tickets and customer SLAs", setupTasks: ["Configure SLA policy"] },
  kb: { label: "Knowledge", description: "SOPs and team docs", setupTasks: ["Create team space"] },
  payroll: { label: "Payroll", description: "Pay runs and payslips", setupTasks: ["Configure pay schedule"] },
  timesheets: { label: "Timesheets", description: "Time tracking by project or client", setupTasks: ["Set up projects for tracking"] },
  surveys: { label: "Surveys", description: "Employee and customer feedback", setupTasks: ["Create first survey"] },
  sign: { label: "Sign", description: "e-Signatures for documents", setupTasks: ["Upload first document template"] },
};

export const DEFAULT_DATA: WizardData = {
  goals: [],
  industry: "",
  companyName: "",
  displayName: "",
  fullName: "",
  teamSize: "",
  phone: "",
  installedApps: [],
  modules: [...ORG_MODULE_KEYS],
  invitees: [],
  moduleAnswers: {},
};
