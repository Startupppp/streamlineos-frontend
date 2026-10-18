const LIMIT_LABELS: Record<string, string> = {
  members: "Members",
  projects: "Projects",
  kbPages: "KB pages",
  chatChannels: "Chat channels",
  crmLeads: "CRM leads",
  crmContacts: "CRM contacts",
  crmClients: "CRM clients",
  crmDeals: "CRM deals",
  supportTickets: "Support tickets",
  automations: "Automations",
  signEnvelopes: "Sign envelopes",
  surveys: "Surveys",
  acctInvoices: "Accounting invoices",
  hrCandidates: "HR candidates",
  hrJobPostings: "HR job postings",
};

const LIMIT_KEY_ACRONYMS = new Set(["ai", "crm", "hr", "kb", "pdf", "sms"]);

const MODULE_NAMES: Record<string, string> = {
  build: "Build (Project Management)",
  hr: "HR Management",
  crm: "CRM",
  inventory: "Inventory",
  payroll: "Payroll",
  accounting: "Accounting",
  kb: "Knowledge Base",
  support: "Helpdesk",
  ai: "AI Features",
  chat: "Chat",
  calendar: "Calendar",
  portal: "Client Portal",
  esign: "E-Sign",
};

export function humanizeLimitKey(key: string): string {
  const known = LIMIT_LABELS[key];
  if (known) return known;
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => (LIMIT_KEY_ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word.toLowerCase()));
  if (words.length === 0) return key;
  const [first, ...rest] = words;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
}

export function humanizeModuleKey(key: string): string {
  return (
    MODULE_NAMES[key] ??
    key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
  );
}

export interface GateStateProps {
  compact: boolean;
  className?: string;
}
