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
    sprints: (projectId?: number) =>
      projectId === undefined
        ? ([...base, "projects", "sprints"] as const)
        : ([...base, "projects", "sprints", projectId] as const),
    sprint: (sprintId: number) =>
      [...base, "projects", "sprints", "detail", sprintId] as const,
    tickets: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "tickets"] as const)
        : ([...base, "projects", "tickets", params] as const),
    ticket: (ticketId: number) =>
      [...base, "projects", "tickets", "detail", ticketId] as const,
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
    members: (projectId?: number) =>
      projectId === undefined
        ? ([...base, "projects", "members"] as const)
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
    views: (projectId: number) =>
      [...base, "projects", "views", projectId] as const,
    customFields: (projectId: number) =>
      [...base, "projects", projectId, "custom-fields"] as const,
    ticketCustomFieldValues: (projectId: number, ticketId: number) =>
      [...base, "projects", projectId, "tickets", ticketId, "custom-field-values"] as const,
    automations: (projectId: number) =>
      [...base, "projects", projectId, "automations"] as const,
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
      runs: (projectId: number, status?: string) =>
        status === undefined
          ? ([...base, "projects", projectId, "qa", "runs"] as const)
          : ([...base, "projects", projectId, "qa", "runs", status] as const),
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
      detail: (portfolioId: number) =>
        [...base, "projects", "portfolios", "detail", portfolioId] as const,
    },
    programs: {
      list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "programs", "list"] as const)
        : ([...base, "projects", "programs", "list", params] as const),
      detail: (programId: number) =>
        [...base, "projects", "programs", "detail", programId] as const,
    },
    managedProducts: {
      list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "managed-products", "list"] as const)
        : ([...base, "projects", "managed-products", "list", params] as const),
      detail: (managedProductId: number) =>
        [...base, "projects", "managed-products", "detail", managedProductId] as const,
    },
    pmWorkspaces: {
      list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "pm-workspaces", "list"] as const)
        : ([...base, "projects", "pm-workspaces", "list", params] as const),
      detail: (workspaceId: string) =>
        [...base, "projects", "pm-workspaces", "detail", workspaceId] as const,
      members: (workspaceId: string, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "pm-workspaces", "members", workspaceId] as const)
        : ([...base, "projects", "pm-workspaces", "members", workspaceId, params] as const),
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
    workspaceMembers: {
      all: [...base, "projects", "workspaceMembers"] as const,
      list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "projects", "workspaceMembers", "list"] as const)
        : ([...base, "projects", "workspaceMembers", "list", params] as const),
    },
    publicForms: {
      token: (token: string) =>
        [...base, "projects", "public-form", token] as const,
    },
  },

} as const;
