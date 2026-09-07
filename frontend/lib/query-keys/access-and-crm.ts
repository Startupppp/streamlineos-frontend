import { queryKeyBase as base } from "./base";

export const accessAndCrmQueryKeys = {
  roles: {
    all: [...base, "roles"] as const,
    list: (params?: {
      cursor?: string;
      limit: number;
      search?: string;
    }) =>
      params
        ? ([...base, "roles", "list", params] as const)
        : ([...base, "roles", "list"] as const),
    selectorList: () => [...base, "roles", "list", "selector"] as const,
    permissionCatalog: () => [...base, "roles", "permission-catalog"] as const,
    discoveryGrantable: () =>
      [...base, "roles", "discovery", "grantable"] as const,
    discoveryMembers: () =>
      [...base, "roles", "discovery", "members"] as const,
    detail: (roleId: number) => [...base, "roles", "detail", roleId] as const,
    permissions: (roleId: number) =>
      [...base, "roles", "permissions", roleId] as const,
    members: (roleId: number) => [...base, "roles", "members", roleId] as const,
    analytics: () => [...base, "roles", "analytics"] as const,
    departments: () => [...base, "roles", "departments"] as const,
  },

  principalGroups: {
    all: [...base, "principalGroups"] as const,
    list: (params?: { cursor?: string; limit: number }) =>
      params
        ? ([...base, "principalGroups", "list", params] as const)
        : ([...base, "principalGroups", "list"] as const),
    members: (groupId: string) =>
      [...base, "principalGroups", "members", groupId] as const,
    roles: (groupId: string) =>
      [...base, "principalGroups", "roles", groupId] as const,
  },

  branches: {
    all: [...base, "branches"] as const,
    list: () => [...base, "branches", "list"] as const,
    detail: (branchId: number) =>
      [...base, "branches", "detail", branchId] as const,
  },

  crm: {
    all: [...base, "crm"] as const,
    activityTimeline: (anchor: Record<string, unknown>) =>
      [...base, "crm", "activities", "timeline", anchor] as const,
    myActivityTasks: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "crm", "activities", "my-tasks"] as const)
        : ([...base, "crm", "activities", "my-tasks", params] as const),
    activityParticipants: (activityId: string) =>
      [...base, "crm", "activities", activityId, "participants"] as const,
    dealStageTransitions: (dealId: number) =>
      [...base, "crm", "deals", dealId, "transitions"] as const,
    autonomyDecisions: (filters?: Record<string, unknown>) =>
      filters === undefined
        ? ([...base, "crm", "autonomy", "decisions"] as const)
        : ([...base, "crm", "autonomy", "decisions", filters] as const),
    autonomyDecision: (decisionId: string) =>
      [...base, "crm", "autonomy", "decisions", decisionId] as const,
    autonomySwitches: () => [...base, "crm", "autonomy", "switches"] as const,
    autonomyScoreboard: (days: number) =>
      [...base, "crm", "autonomy", "scoreboard", days] as const,
    autonomyReviewQueue: () => [...base, "crm", "autonomy", "review-queue"] as const,
    autonomySettings: () => [...base, "crm", "autonomy", "settings"] as const,
    autonomyHolds: () => [...base, "crm", "autonomy", "holds"] as const,
    /**
     * The prefix every issue key extends, so one invalidation reaches the list
     * and the open record together. A transition changes the stage on both, and
     * refreshing only one leaves the other showing a stage the ledger has moved
     * past.
     */
    issuesRoot: () => [...base, "crm", "issues"] as const,
    /**
     * The three layout descriptions. Keyed without arguments because there is
     * one answer per tenant, and it changes only when the platform ships one.
     */
    issueRecordTypes: () => [...base, "crm", "issues", "record-types"] as const,
    issues: (params: Record<string, unknown>) =>
      [...base, "crm", "issues", "list", params] as const,
    issue: (issueRecordId: string) =>
      [...base, "crm", "issues", issueRecordId] as const,
    crmImport: (crmImportId: string) =>
      [...base, "crm", "imports", crmImportId] as const,
    salesDashboard: () => [...base, "crm", "salesDashboard"] as const,
    salesKpis: (params: Record<string, unknown>) =>
      [...base, "crm", "salesKpis", params] as const,
    salesFunnel: (params: Record<string, unknown>) =>
      [...base, "crm", "salesFunnel", params] as const,
    salesLeaderboard: (params: Record<string, unknown>) =>
      [...base, "crm", "salesLeaderboard", params] as const,
    revenueVsGoal: (year: number) =>
      [...base, "crm", "revenueVsGoal", year] as const,
    supportDashboard: () => [...base, "crm", "supportDashboard"] as const,
    customerExecutiveDashboard: () =>
      [...base, "crm", "customerExecutiveDashboard"] as const,
    person: (slug: string) => [...base, "crm", "person", slug] as const,
    peopleSlugs: () => [...base, "crm", "peopleSlugs"] as const,
  },

  crmSettings: {
    all: [...base, "crmSettings"] as const,
    assignmentRules: () => [...base, "crmSettings", "assignmentRules"] as const,
    emailTemplates: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "crmSettings", "emailTemplates"] as const)
        : ([...base, "crmSettings", "emailTemplates", params] as const),
    scoringRules: () => [...base, "crmSettings", "scoringRules"] as const,
    slaPolicies: () => [...base, "crmSettings", "slaPolicies"] as const,
    slaReport: () => [...base, "crmSettings", "slaReport"] as const,
    slaBreachedLeads: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "crmSettings", "slaBreachedLeads"] as const)
        : ([...base, "crmSettings", "slaBreachedLeads", params] as const),
    territories: () => [...base, "crmSettings", "territories"] as const,
  },

  crmOrganizations: {
    all: [...base, "crmOrganizations"] as const,
    list: (params?: object) =>
      params === undefined
        ? ([...base, "crmOrganizations", "list"] as const)
        : ([...base, "crmOrganizations", "list", params] as const),
    detail: (crmOrganizationId: number) =>
      [...base, "crmOrganizations", "detail", crmOrganizationId] as const,
    hierarchy: (crmOrganizationId: number) =>
      [...base, "crmOrganizations", "hierarchy", crmOrganizationId] as const,
    rollup: (crmOrganizationId: number) =>
      [...base, "crmOrganizations", "rollup", crmOrganizationId] as const,
    timeline: (crmOrganizationId: number) =>
      [...base, "crmOrganizations", "timeline", crmOrganizationId] as const,
    relatedLeads: (crmOrganizationId: number) =>
      [...base, "crmOrganizations", "relatedLeads", crmOrganizationId] as const,
    duplicates: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "crmOrganizations", "duplicates"] as const)
        : ([...base, "crmOrganizations", "duplicates", params] as const),
  },

  contactRoles: {
    all: [...base, "contactRoles"] as const,
    list: (contactId: number, params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "contactRoles", "list", contactId] as const)
        : ([...base, "contactRoles", "list", contactId, params] as const),
  },

  contactDuplicates: {
    all: [...base, "contactDuplicates"] as const,
    list: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "contactDuplicates", "list"] as const)
        : ([...base, "contactDuplicates", "list", params] as const),
  },

  customer360: {
    all: [...base, "customer360"] as const,
    company: (companyId: number) =>
      [...base, "customer360", "company", companyId] as const,
    client: (clientId: number) =>
      [...base, "customer360", "client", clientId] as const,
    companyTimeline: (companyId: number, cursor?: string) =>
      cursor === undefined
        ? ([...base, "customer360", "companyTimeline", companyId] as const)
        : ([...base, "customer360", "companyTimeline", companyId, cursor] as const),
  },

  dealActivities: {
    all: [...base, "dealActivities"] as const,
    list: (dealId: number, params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "dealActivities", "list", dealId] as const)
        : ([...base, "dealActivities", "list", dealId, params] as const),
  },

  salesTeamCapacity: {
    all: [...base, "salesTeamCapacity"] as const,
    list: () => [...base, "salesTeamCapacity", "list"] as const,
  },

  salesLeaderboard: {
    all: [...base, "salesLeaderboard"] as const,
    list: () => [...base, "salesLeaderboard", "list"] as const,
  },

  auditLog: {
    all: [...base, "auditLog"] as const,
    list: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "auditLog", "list"] as const)
        : ([...base, "auditLog", "list", params] as const),
    actions: () => [...base, "auditLog", "actions"] as const,
    targetTypes: () => [...base, "auditLog", "targetTypes"] as const,
  },

  sessions: {
    all: [...base, "sessions"] as const,
    list: () => [...base, "sessions", "list"] as const,
  },

  tasks: {
    all: [...base, "tasks"] as const,
    list: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "tasks", "list"] as const)
        : ([...base, "tasks", "list", params] as const),
    detail: (taskId: number) => [...base, "tasks", "detail", taskId] as const,
    myQueue: () => [...base, "tasks", "myQueue"] as const,
    overdue: () => [...base, "tasks", "overdue"] as const,
    sequences: () => [...base, "tasks", "sequences"] as const,
  },

  crmActivities: {
    all: [...base, "crmActivities"] as const,
    list: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "crmActivities", "list"] as const)
        : ([...base, "crmActivities", "list", params] as const),
  },

  blog: {
    all: [...base, "blog"] as const,
    feed: <P>(params?: P) =>
      params === undefined
        ? ([...base, "blog", "feed"] as const)
        : ([...base, "blog", "feed", params] as const),
  },

  blogAdmin: {
    all: [...base, "blogAdmin"] as const,
    posts: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "blogAdmin", "posts"] as const)
        : ([...base, "blogAdmin", "posts", params] as const),
    post: (postId: string) =>
      [...base, "blogAdmin", "post", postId] as const,
    categories: () => [...base, "blogAdmin", "categories"] as const,
  },

  publicBooking: {
    all: [...base, "publicBooking"] as const,
    detail: (token: string) =>
      [...base, "publicBooking", "detail", token] as const,
  },

} as const;
