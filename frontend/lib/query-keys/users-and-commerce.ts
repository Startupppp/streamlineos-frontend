import { queryKeyBase as base, type QueryKeyParams } from "./base";

export const usersAndCommerceQueryKeys = {
  apiTokens: {
    all: [...base, "apiTokens"] as const,
    list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "apiTokens", "list"] as const)
        : ([...base, "apiTokens", "list", params] as const),
  },

  userApiTokens: {
    all: [...base, "userApiTokens"] as const,
    list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "userApiTokens", "list"] as const)
        : ([...base, "userApiTokens", "list", params] as const),
    permissions: () => [...base, "userApiTokens", "permissions"] as const,
  },

  users: {
    all: [...base, "users"] as const,
    list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "users", "list"] as const)
        : ([...base, "users", "list", params] as const),
    detail: (userId: string) => [...base, "users", "detail", userId] as const,
    sessions: (userId: string) =>
      [...base, "users", "sessions", userId] as const,
    preferences: (userId: string) =>
      [...base, "users", "preferences", userId] as const,
    stats: () => [...base, "users", "stats"] as const,
    invitations: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "users", "invitations"] as const)
        : ([...base, "users", "invitations", params] as const),
    loginHistory: (userId: string, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "users", "loginHistory", userId] as const)
        : ([...base, "users", "loginHistory", userId, params] as const),
    membership: (userId: string) =>
      [...base, "users", "membership", userId] as const,
  },

  crmProducts: {
    all: [...base, "crmProducts"] as const,
    list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "crmProducts", "list"] as const)
        : ([...base, "crmProducts", "list", params] as const),
    detail: (productId: number) =>
      [...base, "crmProducts", "detail", productId] as const,
  },

  crmQuotes: {
    all: [...base, "crmQuotes"] as const,
    list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "crmQuotes", "list"] as const)
        : ([...base, "crmQuotes", "list", params] as const),
    byDeal: (dealId: number) =>
      [...base, "crmQuotes", "byDeal", dealId] as const,
    detail: (quoteId: number) =>
      [...base, "crmQuotes", "detail", quoteId] as const,
  },

  crmPricebooks: {
    all: [...base, "crmPricebooks"] as const,
    list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "crmPricebooks", "list"] as const)
        : ([...base, "crmPricebooks", "list", params] as const),
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
    list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "crmQuoteTemplates", "list"] as const)
        : ([...base, "crmQuoteTemplates", "list", params] as const),
  },

  timesheets: {
    all: [...base, "timesheets"] as const,
    payroll: {
      all: [...base, "timesheets", "payroll"] as const,
      summary: (params: QueryKeyParams) =>
        [...base, "timesheets", "payroll", "summary", params] as const,
      exports: (limit?: number) =>
        limit === undefined
          ? ([...base, "timesheets", "payroll", "exports"] as const)
          : ([...base, "timesheets", "payroll", "exports", limit] as const),
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
    /** Org holidays for a week, so the grid can mark closed days. */
    holidays: (startDate: string, endDate: string) =>
      [...base, "timesheets", "holidays", startDate, endDate] as const,
    entries: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "timesheets", "entries"] as const)
        : ([...base, "timesheets", "entries", params] as const),
    timerActive: () => [...base, "timesheets", "timer", "active"] as const,
    periods: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "timesheets", "periods", "list"] as const)
        : ([...base, "timesheets", "periods", "list", params] as const),
    periodCurrent: () => [...base, "timesheets", "periods", "current"] as const,
    periodsOverdue: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "periods", "overdue", params] as const,
    period: (periodId: number) =>
      [...base, "timesheets", "periods", "detail", periodId] as const,
    approvals: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "timesheets", "approvals"] as const)
        : ([...base, "timesheets", "approvals", params] as const),
    billingUninvoiced: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "timesheets", "billing", "uninvoiced"] as const)
        : ([...base, "timesheets", "billing", "uninvoiced", params] as const),
    ratePreview: (params: QueryKeyParams) =>
      [...base, "timesheets", "billing", "rate-preview", params] as const,
    reportsOverview: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "timesheets", "reports", "overview"] as const)
        : ([...base, "timesheets", "reports", "overview", params] as const),
    teamWeekSummary: (params: QueryKeyParams) =>
      [...base, "timesheets", "team", "week-summary", params] as const,
    report: (tab: string, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "timesheets", "reports", tab] as const)
        : ([...base, "timesheets", "reports", tab, params] as const),
    exceptions: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "timesheets", "exceptions", "list"] as const)
        : ([...base, "timesheets", "exceptions", "list", params] as const),
    exceptionsSummary: () =>
      [...base, "timesheets", "exceptions", "summary"] as const,
    settingsHistory: () =>
      [...base, "timesheets", "settings", "history"] as const,
    settings: () => [...base, "timesheets", "settings"] as const,
    rates: () => [...base, "timesheets", "rates"] as const,
    budgets: () => [...base, "timesheets", "budgets"] as const,
    audit: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "timesheets", "audit"] as const)
        : ([...base, "timesheets", "audit", params] as const),
    auditVerify: () => [...base, "timesheets", "audit", "verify"] as const,
  },

} as const;
