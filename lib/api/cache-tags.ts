export const CacheTag = {
  ownerMetrics: "owner-metrics",
  ownerInbox: "owner-inbox",
  ownerCustomers: "owner-customers",
  ownerLeads: "owner-leads",
  ownerVisitors: "owner-visitors",
  ownerRevenue: "owner-revenue",
  leads: "leads",
  deals: "deals",
  quotes: "quotes",
  crmOrganizations: "crm-organizations",
  contacts: "contacts",
  clients: "clients",
  candidates: "candidates",
  employees: "employees",
  projects: "projects",
  tickets: "tickets",
  sprints: "sprints",
  expenses: "expenses",
  documents: "documents",
  notifications: "notifications",
  rbac: "rbac",
  organization: "organization",
  roles: "roles",
  branches: "branches",
  reports: "reports",
  ledgerAccounts: "ledger-accounts",
  journal: "journal",
  trialBalance: "trial-balance",
  profitLoss: "profit-loss",
  customerLedger: "customer-ledger",
  gstr1: "gstr-1",
  balanceSheet: "balance-sheet",
  agedReceivables: "aged-receivables",
  agedPayables: "aged-payables",
  vendorLedger: "vendor-ledger",
  gstr3B: "gstr-3b",
  purchaseBills: "purchase-bills",
  invoices: "invoices",
  tasks: "tasks",
  supportTickets: "support-tickets",
  calendarEvents: "calendar-events",
  targets: "targets",
  announcements: "announcements",
  customFields: "custom-fields",
  webhooks: "webhooks",
  emailTemplates: "email-templates",
  crmSettings: "crm-settings",
  marketingCampaigns: "marketing-campaigns",
  blogPosts: "blog-posts",
  blogCategories: "blog-categories",
  careers: "careers",
  dashboard: "dashboard",
} as const;

export type CacheTagName = (typeof CacheTag)[keyof typeof CacheTag];

export function orgScopedTag(tag: CacheTagName, orgId: string): string {
  return `${tag}:org:${orgId}`;
}

export function userScopedTag(tag: CacheTagName, userId: string): string {
  return `${tag}:user:${userId}`;
}

export function entityScopedTag(tag: CacheTagName, entityId: number | string): string {
  return `${tag}:id:${entityId}`;
}
