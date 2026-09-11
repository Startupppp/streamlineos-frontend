import { queryKeyBase as base, type QueryKeyParams } from "./base";

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
    /** The prefix a new decision invalidates, whatever filters are on screen. */
    autonomyDecisionsAll: () => [...base, "crm", "autonomy", "decisions"] as const,
    autonomyDecisions: (filters?: Record<string, unknown>) =>
      filters === undefined
        ? ([...base, "crm", "autonomy", "decisions"] as const)
        : ([...base, "crm", "autonomy", "decisions", filters] as const),
    autonomyDecision: (decisionId: string) =>
      [...base, "crm", "autonomy", "decisions", decisionId] as const,
    autonomySwitches: () => [...base, "crm", "autonomy", "switches"] as const,
    autonomyClassStops: () => [...base, "crm", "autonomy", "class-stops"] as const,
    autonomyRepairPolicies: () => [...base, "crm", "autonomy", "repair-policies"] as const,
    autonomyRepairs: (filters?: Record<string, unknown>) =>
      filters === undefined
        ? ([...base, "crm", "autonomy", "repairs"] as const)
        : ([...base, "crm", "autonomy", "repairs", filters] as const),
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
    /**
     * The compiled statement for a description, never the run. Its own key
     * because it answers a different question about the same input and shares
     * nothing with the result — one key for both would serve a run result to a
     * caller that asked what the SQL was.
     */
    reportingExplain: (description: unknown) =>
      [...base, "crm", "reporting", "explain", description] as const,
    /**
     * The prefix a save, edit or delete invalidates — the list, every page of
     * it, and every opened definition sit underneath it.
     */
    reportingDefinitionsAll: () => [...base, "crm", "reporting", "definitions"] as const,
    reportingDefinitions: (params: Record<string, unknown>) =>
      [...base, "crm", "reporting", "definitions", "list", params] as const,
    reportingDefinition: (reportDefinitionId: string) =>
      [...base, "crm", "reporting", "definitions", "detail", reportDefinitionId] as const,
    /**
     * A saved report's own run, keyed by id and overrides rather than by the
     * description — the same description run through the saved route is a
     * different act, because the audit row it writes names the definition.
     */
    reportingDefinitionRun: (reportDefinitionId: string, overrides: unknown) =>
      [...base, "crm", "reporting", "definitions", reportDefinitionId, "run", overrides] as const,
    /** Every timetable, and the prefix a change to one invalidates. */
    reportingSchedules: () => [...base, "crm", "reporting", "schedules"] as const,
    /** The audit read: what has been run, and what statement was executed. */
    reportingRunsAll: () => [...base, "crm", "reporting", "runs"] as const,
    reportingRuns: (params: Record<string, unknown>) =>
      [...base, "crm", "reporting", "runs", "list", params] as const,
    /**
     * The criteria vocabulary a segment may be written against — the same
     * registry reporting exposes, filtered to the sources this caller may
     * evaluate. One answer per tenant, so no arguments.
     */
    segmentSources: () => [...base, "crm", "segments", "sources"] as const,
    /**
     * The prefix a save, edit or delete invalidates.
     *
     * `saved` sits between `segments` and the reads on purpose. The obvious
     * prefix — `["crm", "segments"]` — also covers the source catalogue and the
     * unsaved preview, so every mutation would refetch a 30-minute catalogue
     * that cannot have changed. Naming the saved half separately keeps one
     * invalidation call reaching exactly the reads a mutation moves.
     */
    segmentsSaved: () => [...base, "crm", "segments", "saved"] as const,
    segments: (params: Record<string, unknown>) =>
      [...base, "crm", "segments", "saved", "list", params] as const,
    segment: (segmentId: string) =>
      [...base, "crm", "segments", "saved", "detail", segmentId] as const,
    /**
     * Who is in a segment, keyed by the bound as well as the id — a sample of
     * ten and a sample of a hundred are different answers to the same question,
     * and sharing a key would serve the short one to a caller that asked for the
     * long one.
     */
    segmentMembers: (segmentId: string, limit: number) =>
      [...base, "crm", "segments", "saved", "detail", segmentId, "members", limit] as const,
    /**
     * A count for criteria nobody has saved, keyed by the whole tree because the
     * tree *is* the question — two previews differing only in a value are two
     * different counts.
     */
    segmentPreview: (source: string, criteria: unknown) =>
      [...base, "crm", "segments", "preview", source, criteria] as const,
  },

  crmSettings: {
    all: [...base, "crmSettings"] as const,
    assignmentRules: () => [...base, "crmSettings", "assignmentRules"] as const,
    mcpAgentTokens: () => [...base, "crmSettings", "mcpAgentTokens"] as const,
    mcpTools: () => [...base, "crmSettings", "mcpTools"] as const,
    /** Whether this organisation lets agents drive the CRM at all. */
    mcpAccess: () => [...base, "crmSettings", "mcpAccess"] as const,
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

  crmLifecycle: {
    all: [...base, "crmLifecycle"] as const,
    list: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "crmLifecycle", "list"] as const)
        : ([...base, "crmLifecycle", "list", params] as const),
    healthRoster: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "crmLifecycle", "healthRoster"] as const)
        : ([...base, "crmLifecycle", "healthRoster", params] as const),
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

  contactConsent: {
    all: [...base, "contactConsent"] as const,
    list: (contactId: number) => [...base, "contactConsent", "list", contactId] as const,
    /*
      The channel is in the key because the count is per channel: caching the
      EMAIL count under a channel-less key would answer the SMS question with
      the email number, which is the one mistake this registry exists to stop.
    */
    missing: (channel: string) => [...base, "contactConsent", "missing", channel] as const,
    /*
      The limit is in the key for the same reason the channel is: it changes the
      result. A cache keyed without it would answer a request for twenty events
      with the five somebody else asked for, and the caller has no way to see
      that the trail was truncated.
    */
    events: (contactId: number, limit: number) =>
      [...base, "contactConsent", "events", contactId, limit] as const,
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

  /**
   * CRM-P2-12. Suggested competitors, keyed apart from `deals.competitors`.
   *
   * A separate factory rather than another member of the deals one, so that
   * invalidating the manual list after an accept and invalidating the proposal
   * list are two statements a reader can see are both there. Folding them into
   * one prefix would make the accept path look correct while refreshing only
   * half the card.
   */
  dealCompetitorSuggestions: {
    all: [...base, "dealCompetitorSuggestions"] as const,
    list: (dealId: number, status?: string) =>
      status === undefined
        ? ([...base, "dealCompetitorSuggestions", "list", dealId] as const)
        : ([...base, "dealCompetitorSuggestions", "list", dealId, status] as const),
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
    list: (params?: QueryKeyParams) =>
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
    list: (params?: QueryKeyParams) =>
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
    posts: (params?: QueryKeyParams) =>
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
