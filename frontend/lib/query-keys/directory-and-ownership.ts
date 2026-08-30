import { queryKeyBase as base } from "./base";

export const directoryAndOwnershipQueryKeys = {
  platform: {
    all: [...base, "platform"] as const,
    admins: () => [...base, "platform", "admins"] as const,
  },

  mail: {
    all: [...base, "mail"] as const,
    accounts: () => [...base, "mail", "accounts"] as const,
    messages: (params?: Record<string, unknown>) =>
      [...base, "mail", "messages", params] as const,
    thread: (accountId: number, threadId: string) =>
      [...base, "mail", "thread", accountId, threadId] as const,
    message: (accountId: number, messageId: string) =>
      [...base, "mail", "message", accountId, messageId] as const,
  },

  directory: {
    all: [...base, "directory"] as const,
    employment: (userIds: readonly string[]) =>
      [...base, "directory", "employment", [...userIds].sort().join(",")] as const,
    peopleAll: [...base, "directory", "people"] as const,
    people: (params?: Record<string, unknown>) =>
      [...base, "directory", "people", params] as const,
    person: (organizationPersonId: string) =>
      [...base, "directory", "people", organizationPersonId] as const,
    workersAll: [...base, "directory", "workers"] as const,
    workers: (params?: Record<string, unknown>) =>
      [...base, "directory", "workers", params] as const,
    worker: (workerId: string) =>
      [...base, "directory", "workers", workerId] as const,
    engagements: (workerId: string) =>
      [...base, "directory", "workers", workerId, "engagements"] as const,
  },

  party: {
    all: [...base, "party"] as const,
    parties: (params?: Record<string, unknown>) =>
      [...base, "party", "parties", params] as const,
    party: (partyId: string) => [...base, "party", "parties", partyId] as const,
    contacts: (partyId: string) =>
      [...base, "party", "parties", partyId, "contacts"] as const,
    subjectTypes: [...base, "party", "subject-types"] as const,
    subjects: (params?: Record<string, unknown>) =>
      [...base, "party", "subjects", params] as const,
    subject: (subjectId: string) => [...base, "party", "subjects", subjectId] as const,
    partySubjects: (partyId: string) =>
      [...base, "party", "parties", partyId, "subjects"] as const,
  },

  portalAccess: {
    all: [...base, "portalAccess"] as const,
    memberships: (params?: Record<string, unknown>) =>
      [...base, "portalAccess", "memberships", params] as const,
    membership: (portalMembershipId: string) =>
      [...base, "portalAccess", "memberships", portalMembershipId] as const,
    grants: (params?: Record<string, unknown>) =>
      [...base, "portalAccess", "grants", params] as const,
    grant: (projectClientGrantId: string) =>
      [...base, "portalAccess", "grants", projectClientGrantId] as const,
  },

  moduleAccess: {
    all: [...base, "moduleAccess"] as const,
    catalog: (moduleKey: string) =>
      [...base, "moduleAccess", moduleKey, "catalog"] as const,
    roles: (moduleKey: string) =>
      [...base, "moduleAccess", moduleKey, "roles"] as const,
    roleGroups: (moduleKey: string) =>
      [...base, "moduleAccess", moduleKey, "groups"] as const,
    groupMembers: (moduleKey: string, groupId: number) =>
      [...base, "moduleAccess", moduleKey, "groups", groupId, "members"] as const,
    memberCandidatesAll: (moduleKey: string) =>
      [...base, "moduleAccess", moduleKey, "member-candidates"] as const,
    memberCandidates: (
      moduleKey: string,
      params: {
        page: number;
        pageSize: number;
        search: string;
        userId?: string;
        excludeAssigned: boolean;
      },
    ) =>
      [...base, "moduleAccess", moduleKey, "member-candidates", params] as const,
    ownership: (moduleKey: string) =>
      [...base, "moduleAccess", moduleKey, "ownership"] as const,
    members: (
      moduleKey: string,
      params: { page: number; pageSize: number; userId?: string },
    ) => [...base, "moduleAccess", moduleKey, "members", params] as const,
    membersInfinite: (
      moduleKey: string,
      params: { pageSize: number; userId?: string },
    ) => [...base, "moduleAccess", moduleKey, "members-infinite", params] as const,
    auditLog: (moduleKey: string, params: { page: number; pageSize: number }) =>
      [...base, "moduleAccess", moduleKey, "audit-log", params] as const,
    myPermissions: (moduleKey: string) =>
      [...base, "moduleAccess", moduleKey, "me", "permissions"] as const,
    memberGrants: (moduleKey: string, membershipId: number) =>
      [...base, "moduleAccess", moduleKey, "members", membershipId, "grants"] as const,
  },

  portal: {
    all: [...base, "portal"] as const,
    projects: () => [...base, "portal", "projects"] as const,
    projectOverview: (projectId: number) =>
      [...base, "portal", "projects", projectId, "overview"] as const,
  },

  hrSimulations: {
    all: [...base, "hr-simulations"] as const,
    history: (params: Record<string, unknown>) =>
      [...base, "hr-simulations", "history", params] as const,
    compare: (params: Record<string, unknown> | null) =>
      [...base, "hr-simulations", "compare", params] as const,
  },

  hrSafety: {
    all: [...base, "hr-safety"] as const,
    incidents: (params: Record<string, unknown>) =>
      [...base, "hr-safety", "incidents", params] as const,
    incident: (incidentId: number) =>
      [...base, "hr-safety", "incident", incidentId] as const,
    wellnessAll: [...base, "hr-safety", "wellness"] as const,
    wellnessPulse: [...base, "hr-safety", "wellness", "pulse"] as const,
    myCheckins: (fromDate?: string, toDate?: string) =>
      [...base, "hr-safety", "wellness", "my", fromDate, toDate] as const,
    wellnessTrend: (fromDate?: string, toDate?: string) =>
      [...base, "hr-safety", "wellness", "trend", fromDate, toDate] as const,
    burnout: [...base, "hr-safety", "wellness", "burnout"] as const,
  },

  ownership: {
    all: [...base, "ownership"] as const,
    orgTransfers: () => [...base, "ownership", "org", "transfers"] as const,
    incomingTransfers: () =>
      [...base, "ownership", "transfers", "incoming"] as const,
  },
} as const;
