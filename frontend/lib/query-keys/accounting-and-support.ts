import { queryKeyBase as base, type QueryKeyParams } from "./base";

export const accountingAndSupportQueryKeys = {
  accounting: {
    all: [...base, "accounting"] as const,
  },

  recurringInvoices: {
    all: [...base, "recurringInvoices"] as const,
    list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "recurringInvoices", "list"] as const)
        : ([...base, "recurringInvoices", "list", params] as const),
    due: () => [...base, "recurringInvoices", "due"] as const,
  },

  goals: {
    all: [...base, "goals"] as const,
    list: (params?: QueryKeyParams) =>
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
    burnup: (projectId: number, cycleId?: number) =>
      cycleId === undefined
        ? ([...base, "projectReports", "burnup", projectId] as const)
        : ([...base, "projectReports", "burnup", projectId, cycleId] as const),
    cfd: (projectId: number, params?: QueryKeyParams) =>
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
    all: [...base, "whiteboards"] as const,
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
    list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "playbook", "list"] as const)
        : ([...base, "playbook", "list", params] as const),
  },

  supportKb: {
    all: [...base, "supportKb"] as const,
    categories: () => [...base, "supportKb", "categories"] as const,
    articles: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "supportKb", "articles"] as const)
        : ([...base, "supportKb", "articles", params] as const),
    article: (articleId: number) =>
      [...base, "supportKb", "article", articleId] as const,
    publicArticle: (orgId: string, slug: string) =>
      [...base, "supportKb", "publicArticle", orgId, slug] as const,
  },

} as const;
