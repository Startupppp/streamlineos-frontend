import { queryKeyBase as base } from "./base";

export const usersAndCommerceQueryKeys = {
  apiTokens: {
    all: [...base, "apiTokens"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "apiTokens", "list", params] as const,
  },

  userApiTokens: {
    all: [...base, "userApiTokens"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "userApiTokens", "list", params] as const,
    permissions: () => [...base, "userApiTokens", "permissions"] as const,
  },

  users: {
    all: [...base, "users"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "users", "list", params] as const,
    detail: (userId: string) => [...base, "users", "detail", userId] as const,
    sessions: (userId: string) =>
      [...base, "users", "sessions", userId] as const,
    preferences: (userId: string) =>
      [...base, "users", "preferences", userId] as const,
    stats: () => [...base, "users", "stats"] as const,
    invitations: (params?: Record<string, unknown>) =>
      [...base, "users", "invitations", params] as const,
    loginHistory: (userId: string, params?: Record<string, unknown>) =>
      [...base, "users", "loginHistory", userId, params] as const,
    membership: (userId: string) =>
      [...base, "users", "membership", userId] as const,
    orgAuditLog: (params?: Record<string, unknown>) =>
      [...base, "users", "orgAuditLog", params] as const,
  },

  crmProducts: {
    all: [...base, "crmProducts"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "crmProducts", "list", params] as const,
    detail: (productId: number) =>
      [...base, "crmProducts", "detail", productId] as const,
  },

  crmQuotes: {
    all: [...base, "crmQuotes"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "crmQuotes", "list", params] as const,
    byDeal: (dealId: number) =>
      [...base, "crmQuotes", "byDeal", dealId] as const,
    detail: (quoteId: number) =>
      [...base, "crmQuotes", "detail", quoteId] as const,
  },

  crmPricebooks: {
    all: [...base, "crmPricebooks"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "crmPricebooks", "list", params] as const,
    detail: (pricebookId: string) =>
      [...base, "crmPricebooks", "detail", pricebookId] as const,
    entries: (pricebookId: string) =>
      [...base, "crmPricebooks", "entries", pricebookId] as const,
  },
  crmQuoteSettings: {
    all: [...base, "crmQuoteSettings"] as const,
  },
  crmQuoteTemplates: {
    all: [...base, "crmQuoteTemplates"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "crmQuoteTemplates", "list", params] as const,
  },

  timesheets: {
    all: [...base, "timesheets"] as const,
    payroll: {
      all: [...base, "timesheets", "payroll"] as const,
      summary: (params: Record<string, unknown>) =>
        [...base, "timesheets", "payroll", "summary", params] as const,
      exports: (page: number, pageSize: number) =>
        [...base, "timesheets", "payroll", "exports", page, pageSize] as const,
      exportRows: (exportId: number) =>
        [
          ...base,
          "timesheets",
          "payroll",
          "exports",
          exportId,
          "rows",
        ] as const,
      settings: () => [...base, "timesheets", "payroll", "settings"] as const,
    },
    entries: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "entries", params] as const,
    timerActive: () => [...base, "timesheets", "timer", "active"] as const,
    periods: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "periods", "list", params] as const,
    periodCurrent: () => [...base, "timesheets", "periods", "current"] as const,
    period: (periodId: number) =>
      [...base, "timesheets", "periods", "detail", periodId] as const,
    approvals: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "approvals", params] as const,
    billingUninvoiced: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "billing", "uninvoiced", params] as const,
    ratePreview: (params: Record<string, unknown>) =>
      [...base, "timesheets", "billing", "rate-preview", params] as const,
    reportsOverview: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "reports", "overview", params] as const,
    teamWeekSummary: (params: Record<string, unknown>) =>
      [...base, "timesheets", "team", "week-summary", params] as const,
    report: (tab: string, params?: Record<string, unknown>) =>
      [...base, "timesheets", "reports", tab, params] as const,
    exceptions: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "exceptions", "list", params] as const,
    exceptionsSummary: () =>
      [...base, "timesheets", "exceptions", "summary"] as const,
    settingsHistory: () =>
      [...base, "timesheets", "settings", "history"] as const,
    settings: () => [...base, "timesheets", "settings"] as const,
    rates: () => [...base, "timesheets", "rates"] as const,
    budgets: () => [...base, "timesheets", "budgets"] as const,
    audit: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "audit", params] as const,
  },

} as const;
