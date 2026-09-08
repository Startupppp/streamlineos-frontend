import { queryKeyBase as base, type QueryKeyParams } from "./base";

export const platformHierarchyQueryKeys = {
  calendar: {
    all: [...base, "calendar"] as const,
    events: (start: string, end: string, sources?: readonly string[]) =>
      sources === undefined
        ? ([...base, "calendar", "events", start, end] as const)
        : ([...base, "calendar", "events", start, end, sources] as const),
    attendees: (eventId: number) =>
      [...base, "calendar", "attendees", eventId] as const,
    orgMembers: () => [...base, "calendar", "orgMembers"] as const,
    memberSearch: (search: string) =>
      [...base, "calendar", "memberSearch", search] as const,
    externalEvents: (start: string, end: string) =>
      [...base, "calendar", "externalEvents", start, end] as const,
    hrSupplemental: (from: string, to: string) =>
      [...base, "calendar", "hr-supplemental", from, to] as const,
    sources: () => [...base, "calendar", "sources"] as const,
    eventDetail: (eventId: number) => [...base, "calendar", "event", eventId] as const,
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
          : ([...base, "salesAnalytics", "repComparison", rep1Id, rep2Id] as const),
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
