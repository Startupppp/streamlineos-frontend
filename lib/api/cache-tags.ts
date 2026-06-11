export const CacheTag = {
  ownerMetrics: "owner-metrics",
  ownerInbox: "owner-inbox",
  ownerCustomers: "owner-customers",
  ownerLeads: "owner-leads",
  ownerVisitors: "owner-visitors",
  ownerRevenue: "owner-revenue",
  leads: "leads",
  deals: "deals",
  crmOrganizations: "crm-organizations",
  contacts: "contacts",
  candidates: "candidates",
  employees: "employees",
  projects: "projects",
  tickets: "tickets",
  expenses: "expenses",
  documents: "documents",
  notifications: "notifications",
  rbac: "rbac",
  organization: "organization",
  reports: "reports",
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
