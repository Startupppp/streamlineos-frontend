import { queryKeyBase as base } from "./base";

export const accountingAndSupportQueryKeys = {
  accounting: {
    all: [...base, "accounting"] as const,
    accounts: <P>(params?: P) =>
      params === undefined
        ? ([...base, "accounting", "accounts"] as const)
        : ([...base, "accounting", "accounts", params] as const),
    journal: <P>(params?: P) =>
      params === undefined
        ? ([...base, "accounting", "journal"] as const)
        : ([...base, "accounting", "journal", params] as const),
    journalEntry: (journalEntryId: number) =>
      [...base, "accounting", "journalEntry", journalEntryId] as const,
    trialBalance: (asOf: string) =>
      [...base, "accounting", "trialBalance", asOf] as const,
    profitLoss: (from: string, to: string) =>
      [...base, "accounting", "profitLoss", from, to] as const,
    customersOutstanding: <P>(params?: P) =>
      params === undefined
        ? ([...base, "accounting", "customersOutstanding"] as const)
        : ([...base, "accounting", "customersOutstanding", params] as const),
    customerLedger: <P>(clientId: number, params?: P) =>
      params === undefined
        ? ([...base, "accounting", "customerLedger", clientId] as const)
        : ([...base, "accounting", "customerLedger", clientId, params] as const),
    gstr1: (params: { from: string; to: string }) =>
      [...base, "accounting", "gstr1", params] as const,
    balanceSheet: (params: { asOf: string }) =>
      [...base, "accounting", "balanceSheet", params] as const,
    agedReceivables: (params: { asOf: string }) =>
      [...base, "accounting", "agedReceivables", params] as const,
    purchaseBills: <P>(params?: P) =>
      params === undefined
        ? ([...base, "accounting", "purchaseBills"] as const)
        : ([...base, "accounting", "purchaseBills", params] as const),
    purchaseBill: (purchaseBillId: number) =>
      [...base, "accounting", "purchaseBill", purchaseBillId] as const,
    gstr3B: (params: { from: string; to: string }) =>
      [...base, "accounting", "gstr3B", params] as const,
    vendorsOutstanding: <P>(params?: P) =>
      params === undefined
        ? ([...base, "accounting", "vendorsOutstanding"] as const)
        : ([...base, "accounting", "vendorsOutstanding", params] as const),
    vendorLedger: <P>(vendorId: number, params?: P) =>
      params === undefined
        ? ([...base, "accounting", "vendorLedger", vendorId] as const)
        : ([...base, "accounting", "vendorLedger", vendorId, params] as const),
    agedPayables: (params: { asOf: string }) =>
      [...base, "accounting", "agedPayables", params] as const,
    cashFlow: (params: { from: string; to: string }) =>
      [...base, "accounting", "cashFlow", params] as const,
    coaTemplates: () => [...base, "accounting", "coaTemplates"] as const,
    apAll: [...base, "accounting", "ap"] as const,
    arReminderPolicies: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "accounting", "reminder-policies"] as const)
        : ([...base, "accounting", "reminder-policies", params] as const),
  },

  recurringInvoices: {
    all: [...base, "recurringInvoices"] as const,
    list: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "recurringInvoices", "list"] as const)
        : ([...base, "recurringInvoices", "list", params] as const),
    due: () => [...base, "recurringInvoices", "due"] as const,
  },

  goals: {
    all: [...base, "goals"] as const,
    list: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "goals", "list"] as const)
        : ([...base, "goals", "list", params] as const),
    detail: (goalId: number) => [...base, "goals", "detail", goalId] as const,
    stats: () => [...base, "goals", "stats"] as const,
  },

  projectReports: {
    all: [...base, "projectReports"] as const,
    velocity: (projectId: number) =>
      [...base, "projectReports", "velocity", projectId] as const,
    burnup: (projectId: number, sprintId?: number) =>
      sprintId === undefined
        ? ([...base, "projectReports", "burnup", projectId] as const)
        : ([...base, "projectReports", "burnup", projectId, sprintId] as const),
    cfd: (projectId: number, params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "projectReports", "cfd", projectId] as const)
        : ([...base, "projectReports", "cfd", projectId, params] as const),
    criticalPath: (projectId: number) =>
      [...base, "projectReports", "criticalPath", projectId] as const,
    cycleTime: (projectId: number) =>
      [...base, "projectReports", "cycleTime", projectId] as const,
    leadTime: (projectId: number) =>
      [...base, "projectReports", "leadTime", projectId] as const,
  },

  whiteboards: {
    list: (projectId: number) =>
      [...base, "whiteboards", "list", projectId] as const,
    detail: (whiteboardId: number) =>
      [...base, "whiteboards", "detail", whiteboardId] as const,
    publicLink: (token: string) =>
      [...base, "whiteboards", "publicLink", token] as const,
  },

  gitIntegration: {
    all: [...base, "gitIntegration"] as const,
    connections: () => [...base, "gitIntegration", "connections"] as const,
    ticketLinks: (ticketId: number) =>
      [...base, "gitIntegration", "ticketLinks", ticketId] as const,
  },

  ticketActivity: {
    all: [...base, "ticketActivity"] as const,
    list: (ticketId: number) =>
      [...base, "ticketActivity", "list", ticketId] as const,
  },

  supportActivity: {
    all: [...base, "supportActivity"] as const,
    list: (ticketId: number) =>
      [...base, "supportActivity", "list", ticketId] as const,
  },

  kbComments: {
    all: [...base, "kbComments"] as const,
    list: (articleId: number) =>
      [...base, "kbComments", "list", articleId] as const,
  },

  kbAttachments: {
    all: [...base, "kbAttachments"] as const,
    list: (articleId: number) =>
      [...base, "kbAttachments", "list", articleId] as const,
  },

  playbook: {
    all: [...base, "playbook"] as const,
    list: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "playbook", "list"] as const)
        : ([...base, "playbook", "list", params] as const),
  },

  supportKb: {
    all: [...base, "supportKb"] as const,
    categories: () => [...base, "supportKb", "categories"] as const,
    articles: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "supportKb", "articles"] as const)
        : ([...base, "supportKb", "articles", params] as const),
    article: (articleId: number) =>
      [...base, "supportKb", "article", articleId] as const,
    publicArticle: (orgId: string, slug: string) =>
      [...base, "supportKb", "publicArticle", orgId, slug] as const,
  },

} as const;
