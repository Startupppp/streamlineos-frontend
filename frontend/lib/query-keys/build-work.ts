import { queryKeyBase as base, type QueryKeyParams } from "./base";

export const buildWorkQueryKeys = {
  projects: {
    all: [...base, "projects"] as const,
    list: (filters?: QueryKeyParams) =>
      filters === undefined
        ? ([...base, "projects", "list"] as const)
        : ([...base, "projects", "list", filters] as const),
    listInfinite: (filters: QueryKeyParams) =>
      [...base, "projects", "list", filters, "infinite"] as const,
    detail: (projectId: number) =>
      [...base, "projects", "detail", projectId] as const,
    tickets: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "tickets"] as const)
        : ([...base, "projects", "tickets", params] as const),
    ticket: (projectId: number, ticketId: number) =>
      [...base, "projects", "tickets", "detail", projectId, ticketId] as const,
    ticketByKey: (projectId: number, ticketNumber: number) =>
      [...base, "projects", "tickets", "by-key", projectId, ticketNumber] as const,
    ticketRelations: (ticketId: number) =>
      [...base, "projects", "tickets", "detail", ticketId, "relations"] as const,
    subtasks: (ticketId: number, projectId?: number) =>
      projectId === undefined
        ? ([...base, "projects", "subtasks", { ticketId }] as const)
        : ([...base, "projects", "subtasks", { ticketId }, projectId] as const),
    ticketSearch: (searchQuery: string) =>
      [...base, "projects", "search", "tickets", searchQuery] as const,
    members: (projectId?: number, cursor?: string) =>
      projectId === undefined
        ? ([...base, "projects", "members"] as const)
        : cursor
          ? ([...base, "projects", "members", projectId, cursor] as const)
          : ([...base, "projects", "members", projectId] as const),
    labels: (projectId?: number) =>
      projectId === undefined
        ? ([...base, "projects", "labels"] as const)
        : ([...base, "projects", "labels", projectId] as const),
    timeEntries: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "timeEntries"] as const)
        : ([...base, "projects", "timeEntries", params] as const),
    epics: (projectId: number) =>
      [...base, "projects", "epics", projectId] as const,
    cycles: (projectId: number) =>
      [...base, "projects", "cycles", projectId] as const,
    modules: (projectId: number) =>
      [...base, "projects", "modules", projectId] as const,
    views: (projectId: number, cursor?: string) =>
      cursor
        ? ([...base, "projects", "views", projectId, cursor] as const)
        : ([...base, "projects", "views", projectId] as const),
    customFields: (projectId: number) =>
      [...base, "projects", projectId, "custom-fields"] as const,
    ticketCustomFieldValues: (projectId: number, ticketId: number) =>
      [...base, "projects", projectId, "tickets", ticketId, "custom-field-values"] as const,
    automations: (projectId: number) =>
      [...base, "projects", projectId, "automations"] as const,
    invoiceLineDetail: (projectId: number) =>
      [...base, "projects", projectId, "invoice-line-detail"] as const,
    intake: (projectId: number, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "intake", projectId] as const)
        : ([...base, "projects", "intake", projectId, params] as const),
    analytics: (projectId: number) =>
      [...base, "projects", "analytics", projectId] as const,
    watchers: (ticketId: number) =>
      [...base, "projects", "watchers", ticketId] as const,
    budget: (projectId: number) =>
      [...base, "projects", "budget", projectId] as const,
    templates: () => [...base, "projects", "templates"] as const,
    qa: {
      suites: (projectId: number) =>
        [...base, "projects", projectId, "qa", "suites"] as const,
      casesAll: (projectId: number) =>
        [...base, "projects", projectId, "qa", "cases"] as const,
      cases: (projectId: number, params?: QueryKeyParams) =>
        params === undefined
          ? ([...base, "projects", projectId, "qa", "cases"] as const)
          : ([...base, "projects", projectId, "qa", "cases", params] as const),
      runs: (projectId: number, params?: QueryKeyParams) =>
        params === undefined
          ? ([...base, "projects", projectId, "qa", "runs"] as const)
          : ([...base, "projects", projectId, "qa", "runs", params] as const),
      run: (projectId: number, runId: number) =>
        [...base, "projects", projectId, "qa", "runs", runId] as const,
    },
    bugs: {
      list: (projectId: number, params?: QueryKeyParams) =>
        params === undefined
          ? ([...base, "projects", projectId, "bugs"] as const)
          : ([...base, "projects", projectId, "bugs", params] as const),
      detail: (projectId: number, bugId: number) =>
        [...base, "projects", projectId, "bugs", bugId] as const,
    },
    changeRequests: {
      list: (projectId: number, params?: QueryKeyParams) =>
        params === undefined
          ? ([...base, "projects", projectId, "change-requests"] as const)
          : ([...base, "projects", projectId, "change-requests", params] as const),
      detail: (projectId: number, changeRequestId: number) =>
        [
          ...base,
          "projects",
          projectId,
          "change-requests",
          changeRequestId,
        ] as const,
      affectedTickets: (
        projectId: number,
        changeRequestId: number,
        params?: QueryKeyParams,
      ) =>
        params === undefined
          ? ([
              ...base,
              "projects",
              projectId,
              "change-requests",
              changeRequestId,
              "affected-tickets",
            ] as const)
          : ([
              ...base,
              "projects",
              projectId,
              "change-requests",
              changeRequestId,
              "affected-tickets",
              params,
            ] as const),
    },
    clientPortal: {
      projects: () => [...base, "projects", "portal", "projects"] as const,
      overview: (projectId: number) =>
        [...base, "projects", "portal", projectId, "overview"] as const,
      changeRequests: (projectId: number) =>
        [...base, "projects", "portal", projectId, "change-requests"] as const,
      visibility: (projectId: number, ticketCursor?: string, milestoneCursor?: string) =>
        ticketCursor || milestoneCursor
          ? ([...base, "projects", projectId, "client-visibility", ticketCursor ?? null, milestoneCursor ?? null] as const)
          : ([...base, "projects", projectId, "client-visibility"] as const),
    },
    scopeDirectory: {
      all: [...base, "projects", "scope-directory"] as const,
      resolve: (keys: readonly string[]) =>
        [...base, "projects", "scope-directory", "resolve", [...keys].sort()] as const,
      search: (params: QueryKeyParams) =>
        [...base, "projects", "scope-directory", "search", params] as const,
    },
    approvals: {
      inbox: (params?: QueryKeyParams) =>
        params === undefined
          ? ([...base, "projects", "approvals", "inbox"] as const)
          : ([...base, "projects", "approvals", "inbox", params] as const),
      inboxCount: () =>
        [...base, "projects", "approvals", "inbox", "count"] as const,
      list: (projectId: number, params?: QueryKeyParams) =>
        params === undefined
          ? ([...base, "projects", projectId, "approvals"] as const)
          : ([...base, "projects", projectId, "approvals", params] as const),
      detail: (projectId: number, approvalId: number) =>
        [...base, "projects", projectId, "approvals", approvalId] as const,
    },
    risks: {
      list: (projectId: number, params?: QueryKeyParams) =>
        params === undefined
          ? ([...base, "projects", projectId, "risks"] as const)
          : ([...base, "projects", projectId, "risks", params] as const),
      detail: (projectId: number, riskId: number) =>
        [...base, "projects", projectId, "risks", riskId] as const,
      stats: (projectId: number) =>
        [...base, "projects", projectId, "risks", "stats"] as const,
    },
    decisions: {
      list: (projectId: number, params?: QueryKeyParams) =>
        params === undefined
          ? ([...base, "projects", projectId, "decisions"] as const)
          : ([...base, "projects", projectId, "decisions", params] as const),
      detail: (projectId: number, decisionId: number) =>
        [...base, "projects", projectId, "decisions", decisionId] as const,
    },
    meetings: {
      all: (projectId: number) =>
        [...base, "projects", projectId, "meetings"] as const,
      list: (projectId: number, params?: QueryKeyParams) =>
        params === undefined
          ? ([...base, "projects", projectId, "meetings", "list"] as const)
          : ([
              ...base,
              "projects",
              projectId,
              "meetings",
              "list",
              params,
            ] as const),
      detail: (projectId: number, meetingId: number) =>
        [...base, "projects", projectId, "meetings", meetingId] as const,
    },
    incidents: {
      list: (projectId: number, params?: QueryKeyParams) =>
        params === undefined
          ? ([...base, "projects", projectId, "incidents"] as const)
          : ([...base, "projects", projectId, "incidents", params] as const),
      detail: (projectId: number, incidentId: number) =>
        [...base, "projects", projectId, "incidents", incidentId] as const,
    },
    updates: {
      list: (projectId: number, filters?: QueryKeyParams) =>
        filters === undefined
          ? ([...base, "projects", projectId, "updates"] as const)
          : ([...base, "projects", projectId, "updates", filters] as const),
    },
    files: {
      list: (projectId: number, cursor?: string) =>
        cursor === undefined
          ? ([...base, "projects", projectId, "files"] as const)
          : ([...base, "projects", projectId, "files", cursor] as const),
      signedUrl: (projectId: number, fileId: number) =>
        [...base, "projects", projectId, "files", fileId, "url"] as const,
    },
    forms: {
      list: (projectId: number, params?: QueryKeyParams) =>
        params === undefined
          ? ([...base, "projects", projectId, "forms"] as const)
          : ([...base, "projects", projectId, "forms", params] as const),
      detail: (projectId: number, formId: number) =>
        [...base, "projects", projectId, "forms", formId] as const,
      submissions: (projectId: number, formId: number) =>
        [
          ...base,
          "projects",
          projectId,
          "forms",
          formId,
          "submissions",
        ] as const,
    },
    portfolios: {
      list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "portfolios", "list"] as const)
        : ([...base, "projects", "portfolios", "list", params] as const),
      detail: (portfolioId: number, params?: QueryKeyParams) =>
        params === undefined
          ? ([...base, "projects", "portfolios", "detail", portfolioId] as const)
          : ([...base, "projects", "portfolios", "detail", portfolioId, params] as const),
    },
    programs: {
      list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "programs", "list"] as const)
        : ([...base, "projects", "programs", "list", params] as const),
      detail: (programId: number, params?: QueryKeyParams) =>
        params === undefined
          ? ([...base, "projects", "programs", "detail", programId] as const)
          : ([...base, "projects", "programs", "detail", programId, params] as const),
    },
    managedProducts: {
      list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "managed-products", "list"] as const)
        : ([...base, "projects", "managed-products", "list", params] as const),
      listInfinite: (filters: QueryKeyParams) =>
        [...base, "projects", "managed-products", "list", filters, "infinite"] as const,
      detail: (managedProductId: number) =>
        [...base, "projects", "managed-products", "detail", managedProductId] as const,
      insights: (managedProductId: number, filters?: QueryKeyParams) =>
        filters === undefined
          ? ([...base, "projects", "managed-products", "insights", managedProductId] as const)
          : ([...base, "projects", "managed-products", "insights", managedProductId, filters] as const),
    },
    workflow: {
      transitions: (projectId: number) =>
        [...base, "projects", projectId, "workflow", "transitions"] as const,
    },
    allWorkAll: [...base, "projects", "all-work"] as const,
    allWork: (filters?: QueryKeyParams) =>
      filters === undefined
        ? ([...base, "projects", "all-work"] as const)
        : ([...base, "projects", "all-work", filters] as const),
    allWorkInfinite: (filters: QueryKeyParams) =>
      [...base, "projects", "all-work", filters, "infinite"] as const,
    customStates: (projectId: number) =>
      [...base, "projects", projectId, "custom-states"] as const,
    orgCustomStates: () =>
      [...base, "projects", "org-custom-states"] as const,
    columnCounts: (projectId: number, filters?: QueryKeyParams) =>
      [...base, "projects", "column-counts", projectId, filters ?? {}] as const,
    importExport: {
      all: [...base, "projects", "import-export"] as const,
      preview: (projectId: number) =>
        [...base, "projects", "import-export", "preview", projectId] as const,
      commit: (projectId: number) =>
        [...base, "projects", "import-export", "commit", projectId] as const,
      export: (projectId: number) =>
        [...base, "projects", "import-export", "export", projectId] as const,
    },
    webhooks: (projectId: number) =>
      [...base, "projects", projectId, "webhooks"] as const,
    webhookDeliveries: (projectId: number, webhookId: number) =>
      [...base, "projects", projectId, "webhooks", webhookId, "deliveries"] as const,
    workspaceViews: () => [...base, "projects", "workspace-views"] as const,
    agentTokens: () => [...base, "projects", "agent-tokens"] as const,
    iterationSettings: (projectId: number) =>
      [...base, "projects", projectId, "settings", "iterations"] as const,
    agentPulse: (scopeKey: string) =>
      [...base, "projects", "agent-pulse", scopeKey] as const,
    workloadCapacity: (projectId: number, start: string, end: string) =>
      [...base, "projects", projectId, "workload-capacity", start, end] as const,
    commentDrafts: {
      mine: () => [...base, "projects", "comment-drafts", "mine"] as const,
    },
    commentPermalinkWithComment: (
      projectId: number,
      ticketId: number,
      commentId: string,
    ) =>
      [
        ...base,
        "projects",
        "comment-permalink",
        projectId,
        ticketId,
        commentId,
      ] as const,
    commentPermalinkTicket: (projectId: number, ticketId: number) =>
      [...base, "projects", "comment-permalink", projectId, ticketId] as const,
    customers: {
      all: [...base, "projects", "customers"] as const,
      list: (filters?: QueryKeyParams) =>
      filters === undefined
        ? ([...base, "projects", "customers", "list"] as const)
        : ([...base, "projects", "customers", "list", filters] as const),
    },
    roster: {
      detail: (projectId: number) =>
        [...base, "projects", "roster", projectId] as const,
    },
    teams: {
      all: [...base, "projects", "teams"] as const,
      list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "teams", "list"] as const)
        : ([...base, "projects", "teams", "list", params] as const),
      detail: (teamId: number) =>
        [...base, "projects", "teams", "detail", teamId] as const,
      members: (teamId: number, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "teams", "members", teamId] as const)
        : ([...base, "projects", "teams", "members", teamId, params] as const),
      teamProjects: (teamId: number) =>
        [...base, "projects", "teams", "projects", teamId] as const,
    },
    buildMembers: {
      all: [...base, "projects", "buildMembers"] as const,
      list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "buildMembers", "list"] as const)
        : ([...base, "projects", "buildMembers", "list", params] as const),
    },
    publicForms: {
      token: (token: string) =>
        [...base, "projects", "public-form", token] as const,
      projectIntakeForm: (projectId: string) =>
        [...base, "projects", "intake-form", projectId] as const,
    },
    retentionSettings: (projectId: number) =>
      [...base, "projects", projectId, "retention-settings"] as const,
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

} as const;
