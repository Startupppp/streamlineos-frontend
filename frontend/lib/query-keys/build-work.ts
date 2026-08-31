import { queryKeyBase as base } from "./base";

export const buildWorkQueryKeys = {
  projects: {
    all: [...base, "projects"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...base, "projects", "list", filters] as const,
    detail: (projectId: number) =>
      [...base, "projects", "detail", projectId] as const,
    sprints: (projectId?: number) =>
      projectId === undefined
        ? ([...base, "projects", "sprints"] as const)
        : ([...base, "projects", "sprints", projectId] as const),
    sprint: (sprintId: number) =>
      [...base, "projects", "sprints", "detail", sprintId] as const,
    tickets: (params?: Record<string, unknown>) =>
      [...base, "projects", "tickets", params] as const,
    ticket: (ticketId: number) =>
      [...base, "projects", "tickets", "detail", ticketId] as const,
    ticketByKey: (projectId: number, ticketNumber: number) =>
      [...base, "projects", "tickets", "by-key", projectId, ticketNumber] as const,
    ticketRelations: (ticketId: number) =>
      [...base, "projects", "tickets", "detail", ticketId, "relations"] as const,
    subtasks: (ticketId: number) =>
      [...base, "projects", "subtasks", { ticketId }] as const,
    ticketSearch: (searchQuery: string) =>
      [...base, "projects", "search", "tickets", searchQuery] as const,
    members: (projectId?: number) =>
      projectId === undefined
        ? ([...base, "projects", "members"] as const)
        : ([...base, "projects", "members", projectId] as const),
    labels: (projectId?: number) =>
      projectId === undefined
        ? ([...base, "projects", "labels"] as const)
        : ([...base, "projects", "labels", projectId] as const),
    timeEntries: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "projects", "timeEntries"] as const)
        : ([...base, "projects", "timeEntries", params] as const),
    epics: (projectId: number) =>
      [...base, "projects", "epics", projectId] as const,
    cycles: (projectId: number) =>
      [...base, "projects", "cycles", projectId] as const,
    modules: (projectId: number) =>
      [...base, "projects", "modules", projectId] as const,
    views: (projectId: number) =>
      [...base, "projects", "views", projectId] as const,
    intake: (projectId: number) =>
      [...base, "projects", "intake", projectId] as const,
    analytics: (projectId: number) =>
      [...base, "projects", "analytics", projectId] as const,
    watchers: (ticketId: number) =>
      [...base, "projects", "watchers", ticketId] as const,
    budget: (projectId: number) =>
      [...base, "projects", "budget", projectId] as const,
    templates: () => [...base, "projects", "templates"] as const,
    qa: {
      suites: (projectId?: number) =>
        [...base, "projects", projectId, "qa", "suites"] as const,
      casesAll: (projectId?: number) =>
        [...base, "projects", projectId, "qa", "cases"] as const,
      cases: (projectId?: number, params?: Record<string, unknown>) =>
        [...base, "projects", projectId, "qa", "cases", params] as const,
      case: (projectId?: number, testCaseId?: number) =>
        [...base, "projects", projectId, "qa", "cases", testCaseId] as const,
      runs: (projectId?: number, status?: string) =>
        status === undefined
          ? ([...base, "projects", projectId, "qa", "runs"] as const)
          : ([...base, "projects", projectId, "qa", "runs", status] as const),
      run: (projectId?: number, runId?: number) =>
        [...base, "projects", projectId, "qa", "runs", runId] as const,
    },
    bugs: {
      list: (projectId?: number, params?: Record<string, unknown>) =>
        params === undefined
          ? ([...base, "projects", projectId, "bugs"] as const)
          : ([...base, "projects", projectId, "bugs", params] as const),
      detail: (projectId?: number, bugId?: number) =>
        [...base, "projects", projectId, "bugs", bugId] as const,
    },
    changeRequests: {
      list: (projectId: number, params?: Record<string, unknown>) =>
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
    },
    clientPortal: {
      projects: () => [...base, "projects", "portal", "projects"] as const,
      overview: (projectId: number) =>
        [...base, "projects", "portal", projectId, "overview"] as const,
      changeRequests: (projectId: number) =>
        [...base, "projects", "portal", projectId, "change-requests"] as const,
      visibility: (projectId: number) =>
        [...base, "projects", projectId, "client-visibility"] as const,
    },
    approvals: {
      inbox: () => [...base, "projects", "approvals", "inbox"] as const,
      list: (projectId: number, params?: Record<string, unknown>) =>
        params === undefined
          ? ([...base, "projects", projectId, "approvals"] as const)
          : ([...base, "projects", projectId, "approvals", params] as const),
      detail: (projectId: number, approvalId: number) =>
        [...base, "projects", projectId, "approvals", approvalId] as const,
    },
    risks: {
      list: (projectId: number, params?: Record<string, unknown>) =>
        params === undefined
          ? ([...base, "projects", projectId, "risks"] as const)
          : ([...base, "projects", projectId, "risks", params] as const),
      detail: (projectId: number, riskId: number) =>
        [...base, "projects", projectId, "risks", riskId] as const,
    },
    decisions: {
      list: (projectId: number, params?: Record<string, unknown>) =>
        params === undefined
          ? ([...base, "projects", projectId, "decisions"] as const)
          : ([...base, "projects", projectId, "decisions", params] as const),
      detail: (projectId: number, decisionId: number) =>
        [...base, "projects", projectId, "decisions", decisionId] as const,
    },
    meetings: {
      all: (projectId: number) =>
        [...base, "projects", projectId, "meetings"] as const,
      list: (projectId: number, params?: Record<string, unknown>) =>
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
      list: (projectId?: number, params?: Record<string, unknown>) =>
        params === undefined
          ? ([...base, "projects", projectId, "incidents"] as const)
          : ([...base, "projects", projectId, "incidents", params] as const),
      detail: (projectId?: number, incidentId?: number) =>
        [...base, "projects", projectId, "incidents", incidentId] as const,
    },
    forms: {
      list: (projectId: number, params?: Record<string, unknown>) =>
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
      list: (params?: Record<string, unknown>) =>
        [...base, "projects", "portfolios", "list", params] as const,
      detail: (portfolioId: number) =>
        [...base, "projects", "portfolios", "detail", portfolioId] as const,
    },
    programs: {
      list: (params?: Record<string, unknown>) =>
        [...base, "projects", "programs", "list", params] as const,
      detail: (programId: number) =>
        [...base, "projects", "programs", "detail", programId] as const,
    },
    managedProducts: {
      list: (params?: Record<string, unknown>) =>
        [...base, "projects", "managed-products", "list", params] as const,
      detail: (managedProductId: number) =>
        [...base, "projects", "managed-products", "detail", managedProductId] as const,
    },
    pmWorkspaces: {
      list: (params?: Record<string, unknown>) =>
        [...base, "projects", "pm-workspaces", "list", params] as const,
      detail: (workspaceId: string) =>
        [...base, "projects", "pm-workspaces", "detail", workspaceId] as const,
      members: (workspaceId: string, params?: Record<string, unknown>) =>
        [
          ...base,
          "projects",
          "pm-workspaces",
          "members",
          workspaceId,
          params,
        ] as const,
    },
    workflow: {
      transitions: (projectId: number) =>
        [...base, "projects", projectId, "workflow", "transitions"] as const,
    },
    allWork: (filters?: Record<string, unknown>) =>
      [...base, "projects", "all-work", filters] as const,
    allWorkInfinite: (filters: Record<string, unknown>) =>
      [...base, "projects", "all-work", filters, "infinite"] as const,
    columnCounts: (projectId: number) =>
      [...base, "projects", "column-counts", projectId] as const,
    webhooks: (projectId: number) =>
      [...base, "projects", projectId, "webhooks"] as const,
    webhookDeliveries: (projectId: number, webhookId: number) =>
      [...base, "projects", projectId, "webhooks", webhookId, "deliveries"] as const,
    workspaceViews: () => [...base, "projects", "workspace-views"] as const,
    agentTokens: () => [...base, "projects", "agent-tokens"] as const,
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
  },

} as const;
