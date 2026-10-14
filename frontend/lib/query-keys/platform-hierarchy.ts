import { queryKeyBase as base, type QueryKeyParams } from "./base";

export const platformHierarchyQueryKeys = {
  calendar: {
    all: [...base, "calendar"] as const,
    eventsAll: [...base, "calendar", "events"] as const,
    eventsForIdentity: (orgId: string, userId: string) =>
      [...base, "calendar", "events", orgId, userId] as const,
    events: (
      orgId: string,
      userId: string,
      start: string,
      end: string,
      sources?: readonly string[],
    ) =>
      sources === undefined
        ? ([...base, "calendar", "events", orgId, userId, start, end] as const)
        : ([
            ...base,
            "calendar",
            "events",
            orgId,
            userId,
            start,
            end,
            sources,
          ] as const),
    history: (orgId: string, userId: string, before: string) =>
      [
        ...base,
        "calendar",
        "events",
        "history",
        orgId,
        userId,
        before,
      ] as const,
    searchAll: [...base, "calendar", "search"] as const,
    search: (orgId: string, userId: string, filters: Readonly<object>, canView: boolean) =>
      [...base, "calendar", "search", orgId, userId, canView, filters] as const,
    savedViews: [...base, "calendar", "saved-views"] as const,
    protectedWork: [...base, "calendar", "protected-work"] as const,
    commitments: [...base, "calendar", "commitments"] as const,
    coach: (orgId: string, userId: string) => [...base, "calendar", "coach", orgId, userId] as const,
    capacity: (orgId: string, userId: string, input?: Readonly<object>) => [...base, "calendar", "capacity", orgId, userId, input] as const,
    offlinePolicy: (orgId: string, userId: string) => [...base, "calendar", "offline-policy", orgId, userId] as const,
    attendees: (eventId: number) =>
      [...base, "calendar", "attendees", eventId] as const,
    orgMembers: (limit: number) =>
      [...base, "calendar", "orgMembers", limit] as const,
    orgMembersAll: [...base, "calendar", "orgMembers"] as const,
    memberSearch: (search: string, limit: number) =>
      [...base, "calendar", "memberSearch", search, limit] as const,
    memberSearchAll: [...base, "calendar", "memberSearch"] as const,
    externalEventsAll: [...base, "calendar", "externalEvents"] as const,
    externalEvents: (
      orgId: string,
      userId: string,
      start: string,
      end: string,
    ) =>
      [
        ...base,
        "calendar",
        "externalEvents",
        orgId,
        userId,
        start,
        end,
      ] as const,
    hrSupplemental: (orgId: string, from: string, to: string) =>
      [...base, "calendar", "hr-supplemental", orgId, from, to] as const,
    hrSupplementalAll: [...base, "calendar", "hr-supplemental"] as const,
    sourcesAll: [...base, "calendar", "sources"] as const,
    sources: (orgId: string, userId: string) =>
      [...base, "calendar", "sources", orgId, userId] as const,
    eventDetail: (eventId: number) =>
      [...base, "calendar", "event", eventId] as const,
    sourceActionCapabilities: [
      ...base,
      "calendar",
      "source-actions",
      "capabilities",
    ] as const,
    sourceActionProposal: (proposalId: string) =>
      [...base, "calendar", "source-actions", "proposal", proposalId] as const,
    meetingWorkspace: (eventId: number) =>
      [...base, "calendar", "meeting-workspace", eventId] as const,
  },

  integrations: {
    all: [...base, "integrations"] as const,
    connections: () => [...base, "integrations", "connections"] as const,
  },

  settings: {
    all: [...base, "settings"] as const,
    featureFlags: () => [...base, "settings", "featureFlags"] as const,
    aiUsage: () => [...base, "settings", "aiUsage"] as const,
    customFields: (entityType: string) =>
      [...base, "settings", "customFields", entityType] as const,
  },

  salesAnalytics: {
    all: [...base, "salesAnalytics"] as const,
    velocity: (params: QueryKeyParams) =>
      [...base, "salesAnalytics", "velocity", params] as const,
    aging: (thresholdDays: number) =>
      [...base, "salesAnalytics", "aging", thresholdDays] as const,
    cycleLength: (repId?: string) =>
      repId === undefined
        ? ([...base, "salesAnalytics", "cycleLength"] as const)
        : ([...base, "salesAnalytics", "cycleLength", repId] as const),
    lostAnalysis: (repId?: string) =>
      repId === undefined
        ? ([...base, "salesAnalytics", "lostAnalysis"] as const)
        : ([...base, "salesAnalytics", "lostAnalysis", repId] as const),
    cohort: (months: number) =>
      [...base, "salesAnalytics", "cohort", months] as const,
    repComparison: (rep1Id?: number, rep2Id?: number) =>
      rep1Id === undefined
        ? ([...base, "salesAnalytics", "repComparison"] as const)
        : rep2Id === undefined
          ? ([...base, "salesAnalytics", "repComparison", rep1Id] as const)
          : ([
              ...base,
              "salesAnalytics",
              "repComparison",
              rep1Id,
              rep2Id,
            ] as const),
    sourceReport: () => [...base, "salesAnalytics", "sourceReport"] as const,
  },

  hierarchy: {
    all: [...base, "hierarchy"] as const,
    parentOptions: (parentKind: string, search: string) =>
      [...base, "hierarchy", "parentOptions", parentKind, search] as const,
    businessUnits: (params?: QueryKeyParams) =>
      params !== undefined
        ? ([...base, "hierarchy", "businessUnits", params] as const)
        : ([...base, "hierarchy", "businessUnits"] as const),
    branchOptions: () => [...base, "hierarchy", "branchOptions"] as const,
    orgBranches: (params?: QueryKeyParams) =>
      params !== undefined
        ? ([...base, "hierarchy", "orgBranches", params] as const)
        : ([...base, "hierarchy", "orgBranches"] as const),
    departments: (params?: QueryKeyParams) =>
      params !== undefined
        ? ([...base, "hierarchy", "departments", params] as const)
        : ([...base, "hierarchy", "departments"] as const),
    teams: (params?: QueryKeyParams) =>
      params !== undefined
        ? ([...base, "hierarchy", "teams", params] as const)
        : ([...base, "hierarchy", "teams"] as const),
    locations: (params?: QueryKeyParams) =>
      params !== undefined
        ? ([...base, "hierarchy", "locations", params] as const)
        : ([...base, "hierarchy", "locations"] as const),
    costCenters: (params?: QueryKeyParams) =>
      params !== undefined
        ? ([...base, "hierarchy", "costCenters", params] as const)
        : ([...base, "hierarchy", "costCenters"] as const),
    tree: () => [...base, "hierarchy", "tree"] as const,
  },
} as const;
