import type { OrgModuleKey, WizardData } from "./wizard-data-schema";

export const DRAFT_KEY = "org-setup-draft";

export type StepId = "welcome" | "basics" | "workspace" | "products" | "invite";

export function getStepSequence(): StepId[] {
  return ["welcome", "workspace", "products", "invite"];
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
  { id: "build", label: "Build", outcome: "Plan and deliver work on time" },
  { id: "ai", label: "AI Automation", outcome: "Automate busywork across your team" },
  { id: "everything", label: "Build Everything", outcome: "Enable the full StreamlineOS suite" },
] as const;

export const ALWAYS_ENABLED_MODULES = ["chat", "kb"] as const satisfies readonly OrgModuleKey[];

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
  workspace: "Workspace",
  products: "Modules",
  invite: "People",
};

export const STEP_SUBTITLES: Record<StepId, string> = {
  welcome: "Let's get your organization ready to run your business.",
  basics: "Goals unlock modules. Add industry and company, then launch.",
  workspace: "Name your workspace and set your preferences.",
  products: "Pick the modules your team will use.",
  invite: "Invite your team — or skip and do it later.",
};

export const ESTIMATED_MINUTES_REMAINING: Record<StepId, number> = {
  welcome: 2,
  basics: 2,
  workspace: 2,
  products: 1,
  invite: 1,
};

export const MODULE_CATALOG: Record<OrgModuleKey, { label: string; description: string; setupTasks: string[] }> = {
  crm: { label: "CRM", description: "Pipeline, leads, and deals", setupTasks: ["Create first pipeline", "Import contacts"] },
  hr: { label: "HR", description: "Employees, leave, and attendance", setupTasks: ["Add departments", "Invite employees"] },
  inventory: { label: "Inventory", description: "Stock, warehouses, and products", setupTasks: ["Create warehouse", "Import products"] },
  accounting: { label: "Accounting", description: "Invoices, taxes, and reports", setupTasks: ["Set fiscal year", "Configure taxes"] },
  build: { label: "Build", description: "Tasks and delivery tracking", setupTasks: ["Create first project", "Invite team"] },
  support: { label: "Support", description: "Tickets and customer SLAs", setupTasks: ["Configure SLA policy"] },
  kb: { label: "Knowledge", description: "SOPs and team docs", setupTasks: ["Create team space"] },
  chat: { label: "Chat", description: "Team messaging", setupTasks: ["Create first channel"] },
  payroll: { label: "Payroll", description: "Pay runs and payslips", setupTasks: ["Configure pay schedule"] },
  timesheets: { label: "Timesheets", description: "Time tracking by project or client", setupTasks: ["Set up projects for tracking"] },
  surveys: { label: "Surveys", description: "Employee and customer feedback", setupTasks: ["Create first survey"] },
  sign: { label: "Sign", description: "e-Signatures for documents", setupTasks: ["Upload first document template"] },
};

export type ModuleQuestion =
  | { key: string; label: string; type: "select"; options: readonly string[] }
  | { key: string; label: string; type: "text"; maxLength: number };

export const MODULE_QUESTIONS: Partial<Record<OrgModuleKey, ModuleQuestion[]>> = {
  hr: [
    { key: "employeeCount", label: "How many people will you manage?", type: "select", options: ["1-10", "11-50", "51-200", "200+"] as const },
    { key: "firstFocus", label: "What should we set up first?", type: "select", options: ["Employee records", "Leave & attendance", "Hiring & onboarding"] as const },
  ],
  payroll: [
    { key: "payFrequency", label: "How often do you run payroll?", type: "select", options: ["Monthly", "Semi-monthly", "Bi-weekly", "Weekly"] as const },
  ],
  timesheets: [
    { key: "trackingMode", label: "How do you track time?", type: "select", options: ["By project", "By client", "Attendance only"] as const },
  ],
  crm: [
    { key: "salesModel", label: "Who do you sell to?", type: "select", options: ["B2B", "B2C", "Both"] as const },
    { key: "leadSource", label: "Where do most leads come from?", type: "select", options: ["Website", "Referrals", "Outbound", "Events"] as const },
  ],
  support: [
    { key: "supportChannel", label: "Where do customers reach you?", type: "select", options: ["Email", "Live chat", "Customer portal"] as const },
  ],
  accounting: [
    { key: "fiscalYearStart", label: "When does your fiscal year start?", type: "select", options: ["January", "April", "July", "October"] as const },
  ],
  inventory: [
    { key: "stockLocations", label: "How many locations hold stock?", type: "select", options: ["1", "2-5", "6+"] as const },
  ],
  build: [
    { key: "workType", label: "What will your team deliver?", type: "select", options: ["Software", "Client projects", "Internal operations", "Marketing"] as const },
    { key: "firstProjectName", label: "Name your first project", type: "text", maxLength: 80 },
  ],
  surveys: [
    { key: "audience", label: "Who will you survey?", type: "select", options: ["Employees", "Customers", "Both"] as const },
  ],
  sign: [
    { key: "documentType", label: "What will you send for signature?", type: "select", options: ["Offer letters", "Contracts", "NDAs", "Other"] as const },
  ],
};

export const MODULE_GROUPS: { heading: string; keys: OrgModuleKey[] }[] = [
  { heading: "People", keys: ["hr", "payroll", "timesheets"] },
  { heading: "Customers & money", keys: ["crm", "support", "accounting", "inventory"] },
  { heading: "Work", keys: ["build", "sign", "surveys"] },
];

export const DEFAULT_DATA: WizardData = {
  goals: [],
  industry: "",
  companyName: "",
  displayName: "",
  fullName: "",
  teamSize: "",
  phone: "",
  installedApps: [],
  modules: [...ALWAYS_ENABLED_MODULES],
  invitees: [],
  moduleAnswers: {},
};
