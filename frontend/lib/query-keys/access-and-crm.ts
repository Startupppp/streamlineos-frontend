import { queryKeyBase as base } from "./base";

export const accessAndCrmQueryKeys = {
  roles: {
    all: [...base, "roles"] as const,
    list: (params?: {
      page: number;
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
    list: (params?: { page: number; limit: number }) =>
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
      [...base, "crm", "activities", "my-tasks", params] as const,
    activityParticipants: (activityId: string) =>
      [...base, "crm", "activities", activityId, "participants"] as const,
    dealStageTransitions: (dealId: number) =>
      [...base, "crm", "deals", dealId, "transitions"] as const,
    autonomyDecisions: (filters?: Record<string, unknown>) =>
      [...base, "crm", "autonomy", "decisions", filters] as const,
    autonomyDecision: (decisionId: string) =>
      [...base, "crm", "autonomy", "decisions", decisionId] as const,
    autonomySwitches: () => [...base, "crm", "autonomy", "switches"] as const,
    autonomyClassStops: () => [...base, "crm", "autonomy", "class-stops"] as const,
    autonomyRepairPolicies: () => [...base, "crm", "autonomy", "repair-policies"] as const,
    autonomyRepairs: (filters?: Record<string, unknown>) =>
      [...base, "crm", "autonomy", "repairs", filters] as const,
    autonomyRepairMeasure: (days: number) =>
      [...base, "crm", "autonomy", "repair-measure", days] as const,
    autonomyScoreboard: (days: number) =>
      [...base, "crm", "autonomy", "scoreboard", days] as const,
    autonomyReviewQueue: () => [...base, "crm", "autonomy", "review-queue"] as const,
    autonomySettings: () => [...base, "crm", "autonomy", "settings"] as const,
    autonomyHolds: () => [...base, "crm", "autonomy", "holds"] as const,
    autonomyColdOutbound: () => [...base, "crm", "autonomy", "cold-outbound"] as const,
    /**
     * The prefix everything nurture extends, so one invalidation after a write
     * reaches the list, the open cadence and its enrolments together. A step
     * replacement changes `stepCount` on the list row and a delete exits every
     * enrolment, so refreshing one of the three leaves the other two describing
     * a sequence the server has moved past.
     */
    autonomyNurture: () => [...base, "crm", "autonomy", "nurture"] as const,
    autonomyNurtureSequences: (params: Record<string, unknown>) =>
      [...base, "crm", "autonomy", "nurture", "sequences", "list", params] as const,
    autonomyNurtureSequence: (nurtureSequenceId: string) =>
      [...base, "crm", "autonomy", "nurture", "sequences", nurtureSequenceId] as const,
    autonomyNurtureEnrollments: (nurtureSequenceId: string, params: Record<string, unknown>) =>
      [
        ...base,
        "crm",
        "autonomy",
        "nurture",
        "sequences",
        nurtureSequenceId,
        "enrollments",
        params,
      ] as const,
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
    /** The queryable surface, already filtered to what the caller may run. */
    reportingSources: () => [...base, "crm", "reporting", "sources"] as const,
    /**
     * A run keyed by the whole description, because the description *is* the
     * question — two runs differing only in a filter value are two different
     * reports, and sharing a key would serve one answer for both.
     */
    reportingRun: (description: unknown) =>
      [...base, "crm", "reporting", "run", description] as const,
  },

  crmSettings: {
    all: [...base, "crmSettings"] as const,
    assignmentRules: () => [...base, "crmSettings", "assignmentRules"] as const,
    mcpAgentTokens: () => [...base, "crmSettings", "mcpAgentTokens"] as const,
    mcpTools: () => [...base, "crmSettings", "mcpTools"] as const,
    emailTemplates: (params?: Record<string, unknown>) =>
      [...base, "crmSettings", "emailTemplates", params] as const,
    scoringRules: () => [...base, "crmSettings", "scoringRules"] as const,
    slaPolicies: () => [...base, "crmSettings", "slaPolicies"] as const,
    slaReport: () => [...base, "crmSettings", "slaReport"] as const,
    slaBreachedLeads: (params?: Record<string, unknown>) =>
      [...base, "crmSettings", "slaBreachedLeads", params] as const,
    territories: () => [...base, "crmSettings", "territories"] as const,
  },

  crmLifecycle: {
    all: [...base, "crmLifecycle"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "crmLifecycle", "list", params] as const,
    healthRoster: (params?: Record<string, unknown>) =>
      [...base, "crmLifecycle", "healthRoster", params] as const,
  },

  crmOrganizations: {
    all: [...base, "crmOrganizations"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "crmOrganizations", "list", params] as const,
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
      [...base, "crmOrganizations", "duplicates", params] as const,
  },

  contactRoles: {
    all: [...base, "contactRoles"] as const,
    list: (contactId: number, params?: Record<string, unknown>) =>
      [...base, "contactRoles", "list", contactId, params] as const,
  },

  contactDuplicates: {
    all: [...base, "contactDuplicates"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "contactDuplicates", "list", params] as const,
  },

  customer360: {
    all: [...base, "customer360"] as const,
    company: (companyId: number) =>
      [...base, "customer360", "company", companyId] as const,
    client: (clientId: number) =>
      [...base, "customer360", "client", clientId] as const,
    companyTimeline: (companyId: number, cursor?: string) =>
      [...base, "customer360", "companyTimeline", companyId, cursor] as const,
  },

  dealActivities: {
    all: [...base, "dealActivities"] as const,
    list: (dealId: number, params?: Record<string, unknown>) =>
      [...base, "dealActivities", "list", dealId, params] as const,
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
      [...base, "auditLog", "list", params] as const,
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
      [...base, "tasks", "list", params] as const,
    detail: (taskId: number) => [...base, "tasks", "detail", taskId] as const,
    myQueue: () => [...base, "tasks", "myQueue"] as const,
    overdue: () => [...base, "tasks", "overdue"] as const,
    overdueCount: () => [...base, "tasks", "overdueCount"] as const,
    sequences: () => [...base, "tasks", "sequences"] as const,
  },

  crmActivities: {
    all: [...base, "crmActivities"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "crmActivities", "list", params] as const,
  },

  blog: {
    all: [...base, "blog"] as const,
    feed: <P extends object>(params?: P) =>
      [...base, "blog", "feed", params] as const,
  },

  publicBooking: {
    all: [...base, "publicBooking"] as const,
    detail: (token: string) =>
      [...base, "publicBooking", "detail", token] as const,
  },

} as const;
