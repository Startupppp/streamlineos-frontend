import { queryKeyBase as base } from "./base";

export const platformCoreQueryKeys = {
  reports: {
    all: [...base, "reports"] as const,
    attendance: (params?: Record<string, unknown>) =>
      [...base, "reports", "attendance", params] as const,
    project: (params?: Record<string, unknown>) =>
      [...base, "reports", "project", params] as const,
    teamPerformance: (params?: Record<string, unknown>) =>
      [...base, "reports", "teamPerformance", params] as const,
    dashboardStats: () => [...base, "reports", "dashboardStats"] as const,
  },

  notifications: {
    all: [...base, "notifications"] as const,
    lists: () => [...base, "notifications", "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "notifications", "list", params] as const,
    unreadList: () => [...base, "notifications", "list", "unread"] as const,
    unreadCount: () => [...base, "notifications", "unreadCount"] as const,
    preferences: () => [...base, "notifications", "preferences"] as const,
    templates: (params?: Record<string, unknown>) =>
      [...base, "notifications", "templates", params] as const,
    template: (templateId: number) =>
      [...base, "notifications", "template", templateId] as const,
    broadcasts: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "notifications", "broadcasts"] as const)
        : ([...base, "notifications", "broadcasts", params] as const),
    broadcast: (broadcastId: number) =>
      [...base, "notifications", "broadcast", broadcastId] as const,
    providers: () => [...base, "notifications", "providers"] as const,
    events: () => [...base, "notifications", "events"] as const,
    policy: () => [...base, "notifications", "policy"] as const,
    suppressions: () => [...base, "notifications", "suppressions"] as const,
  },

  invoice: {
    all: [...base, "invoice"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "invoice", "list", params] as const,
    detail: (invoiceId: number) =>
      [...base, "invoice", "detail", invoiceId] as const,
    stats: () => [...base, "invoice", "stats"] as const,
  },

  support: {
    all: [...base, "support"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "support", "list", params] as const,
    detail: (supportTicketId: number) =>
      [...base, "support", "detail", supportTicketId] as const,
  },

  organization: {
    all: [...base, "organization"] as const,
    archived: () => [...base, "organization", "archived"] as const,
    members: () => [...base, "organization", "members"] as const,
    settings: () => [...base, "organization", "settings"] as const,
    display: () => [...base, "organization", "display"] as const,
    holidays: [...base, "organization", "holidays"] as const,
  },

  orgSetup: {
    all: [...base, "org-setup"] as const,
    session: () => [...base, "org-setup", "session"] as const,
  },

  onboardingFlow: {
    all: [...base, "onboarding-flow"] as const,
    session: () => [...base, "onboarding-flow", "session"] as const,
    personalDetails: () =>
      [...base, "onboarding-flow", "personal-details"] as const,
    bankDetails: () =>
      [...base, "onboarding-flow", "bank-details"] as const,
    requirements: (country: string) =>
      [...base, "onboarding-flow", "requirements", country] as const,
    moduleChecklists: () =>
      [...base, "onboarding-flow", "module-checklists"] as const,
    moduleChecklist: (moduleKey: string) =>
      [...base, "onboarding-flow", "module-checklists", moduleKey] as const,
    tours: () => [...base, "onboarding-flow", "tours"] as const,
  },

  payments: {
    all: [...base, "payments"] as const,
    catalog: () => [...base, "payments", "catalog"] as const,
    providers: () => [...base, "payments", "providers"] as const,
    provider: (providerKey: string) =>
      [...base, "payments", "providers", providerKey] as const,
    testTransactions: (providerKey: string) =>
      [
        ...base,
        "payments",
        "providers",
        providerKey,
        "test-transactions",
      ] as const,
    webhookEvents: (providerKey: string) =>
      [
        ...base,
        "payments",
        "providers",
        providerKey,
        "webhook-events",
      ] as const,
    readiness: (providerKey: string) =>
      [...base, "payments", "providers", providerKey, "readiness"] as const,
    audit: (providerKey?: string) =>
      [...base, "payments", "audit", providerKey ?? "all"] as const,
  },

  recordLayouts: {
    all: [...base, "record-layouts"] as const,
    adjustment: (orgId: string | null | undefined, layoutKey: string) =>
      [...base, "record-layouts", orgId ?? "no-tenant", layoutKey] as const,
    usage: (orgId: string | null | undefined, layoutKey: string) =>
      [...base, "record-layouts", orgId ?? "no-tenant", layoutKey, "usage"] as const,
  },

  inbox: {
    all: [...base, "inbox"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "inbox", "list", params] as const,
    count: () => [...base, "inbox", "count"] as const,
    unified: (params?: Record<string, unknown>) =>
      [...base, "inbox", "unified", params] as const,
  },

  access: {
    all: [...base, "access"] as const,
    me: () => [...base, "access", "me"] as const,
    simulate: (targetUserId: string) =>
      [...base, "access", "simulate", targetUserId] as const,
    simulationCandidates: (params: {
      cursor?: string;
      limit: number;
      search?: string;
    }) => [...base, "access", "simulate", "candidates", params] as const,
    resourceGrants: (resourceType: string, resourceId: string) =>
      [...base, "access", "resource-grants", resourceType, resourceId] as const,
    orgModules: () => [...base, "access", "org-modules"] as const,
  },

  invitation: {
    token: (token: string) => [...base, "invitation", token] as const,
  },

  attachmentSignedUrl: (fileUrl: string) =>
    [...base, "attachments", "signed-url", fileUrl] as const,

  executiveBrief: [...base, "ai", "executive-brief"] as const,

} as const;
