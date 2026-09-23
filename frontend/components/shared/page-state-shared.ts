const LIMIT_LABELS: Record<string, string> = {
  members: "Members",
  projects: "Projects",
  kbPages: "KB Pages",
  chatChannels: "Chat Channels",
  crmLeads: "CRM Leads",
  crmContacts: "CRM Contacts",
  crmDeals: "CRM Deals",
  supportTickets: "Support Tickets",
  automations: "Automations",
  signEnvelopes: "Sign Envelopes",
  surveys: "Surveys",
  acctInvoices: "Accounting Invoices",
};

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
  return (
    LIMIT_LABELS[key] ??
    key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
  );
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
