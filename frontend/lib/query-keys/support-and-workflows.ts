import { queryKeyBase as base } from "./base";

export const supportAndWorkflowsQueryKeys = {
  supportMacros: {
    all: [...base, "supportMacros"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "supportMacros", "list", params] as const,
    usage: () => [...base, "supportMacros", "usage"] as const,
  },

  supportSlaPolicies: {
    all: [...base, "supportSlaPolicies"] as const,
    list: () => [...base, "supportSlaPolicies", "list"] as const,
  },

  supportCustomFields: {
    all: [...base, "supportCustomFields"] as const,
    list: (activeOnly?: boolean) =>
      [...base, "supportCustomFields", "list", activeOnly ?? null] as const,
    ticketValues: (ticketId: number) =>
      [...base, "supportCustomFields", "ticketValues", ticketId] as const,
    portalActive: () =>
      [...base, "supportCustomFields", "portalActive"] as const,
  },

  supportSettingsAuditLog: {
    all: [...base, "supportSettingsAuditLog"] as const,
    list: (entityType?: string) =>
      [...base, "supportSettingsAuditLog", "list", entityType ?? null] as const,
  },

  supportBusinessHours: {
    all: [...base, "supportBusinessHours"] as const,
    list: () => [...base, "supportBusinessHours", "list"] as const,
  },

  supportTicketRisk: {
    all: [...base, "supportTicketRisk"] as const,
    detail: (ticketId: number) =>
      [...base, "supportTicketRisk", "detail", ticketId] as const,
  },

  supportChannels: {
    all: [...base, "supportChannels"] as const,
    list: () => [...base, "supportChannels", "list"] as const,
  },

  supportChatWidget: {
    all: [...base, "supportChatWidget"] as const,
    session: (orgId: string, token: string) =>
      [...base, "supportChatWidget", "session", orgId, token] as const,
  },

  supportPortalTickets: {
    all: [...base, "supportPortalTickets"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "supportPortalTickets", "list", params] as const,
    detail: (supportPortalTicketId: number) =>
      [...base, "supportPortalTickets", "detail", supportPortalTicketId] as const,
  },

  supportCsat: {
    all: [...base, "supportCsat"] as const,
    report: () => [...base, "supportCsat", "report"] as const,
    survey: (token: string) =>
      [...base, "supportCsat", "survey", token] as const,
  },

  supportAiSuggestions: {
    all: [...base, "supportAiSuggestions"] as const,
    list: (ticketId: number) =>
      [...base, "supportAiSuggestions", "list", ticketId] as const,
  },

  supportAiReport: {
    all: [...base, "supportAiReport"] as const,
    get: (params?: Record<string, unknown>) =>
      [...base, "supportAiReport", "get", params] as const,
  },

  supportAiSettings: {
    all: [...base, "supportAiSettings"] as const,
    get: () => [...base, "supportAiSettings", "get"] as const,
  },

  supportReports: {
    all: [...base, "supportReports"] as const,
    overview: (params?: Record<string, unknown>) =>
      [...base, "supportReports", "overview", params] as const,
    agentPerformance: (params?: Record<string, unknown>) =>
      [...base, "supportReports", "agentPerformance", params] as const,
    queuePerformance: (params?: Record<string, unknown>) =>
      [...base, "supportReports", "queuePerformance", params] as const,
    channelPerformance: (params?: Record<string, unknown>) =>
      [...base, "supportReports", "channelPerformance", params] as const,
    automationPerformance: (params?: Record<string, unknown>) =>
      [...base, "supportReports", "automationPerformance", params] as const,
  },

  supportRouting: {
    all: [...base, "supportRouting"] as const,
    list: () => [...base, "supportRouting", "list"] as const,
  },

  supportAgentSkills: {
    all: [...base, "supportAgentSkills"] as const,
    list: () => [...base, "supportAgentSkills", "list"] as const,
  },

  supportAgentAvailability: {
    all: [...base, "supportAgentAvailability"] as const,
    list: () => [...base, "supportAgentAvailability", "list"] as const,
  },

  supportVipClients: {
    all: [...base, "supportVipClients"] as const,
    list: () => [...base, "supportVipClients", "list"] as const,
  },

  supportQueues: {
    all: [...base, "supportQueues"] as const,
    list: () => [...base, "supportQueues", "list"] as const,
  },

  supportViews: {
    all: [...base, "supportViews"] as const,
    list: () => [...base, "supportViews", "list"] as const,
  },

  supportTags: {
    all: [...base, "supportTags"] as const,
    list: () => [...base, "supportTags", "list"] as const,
  },

  supportWatchers: {
    all: [...base, "supportWatchers"] as const,
    list: (ticketId: number) =>
      [...base, "supportWatchers", "list", ticketId] as const,
  },

  webhooks: {
    all: [...base, "webhooks"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "webhooks", "list", params] as const,
    logs: (endpointId: number, params?: Record<string, unknown>) =>
      params
        ? ([...base, "webhooks", "logs", endpointId, params] as const)
        : ([...base, "webhooks", "logs", endpointId] as const),
  },

  workflows: {
    all: [...base, "workflows"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "workflows", "list", params] as const,
    detail: (workflowId: string) => [...base, "workflows", workflowId] as const,
    executions: (workflowId: string, params?: Record<string, unknown>) =>
      [...base, "workflows", workflowId, "executions", params] as const,
    execution: (workflowId: string, executionId: string) =>
      [...base, "workflows", workflowId, "executions", executionId] as const,
    approvals: () => [...base, "workflows", "approvals"] as const,
    templates: () => [...base, "workflows", "templates"] as const,
    analytics: () => [...base, "workflows", "analytics"] as const,
    schedules: (workflowId: string) =>
      [...base, "workflows", workflowId, "schedules"] as const,
    secrets: (workflowId: string) =>
      [...base, "workflows", workflowId, "secrets"] as const,
  },

  mfa: {
    all: [...base, "mfa"] as const,
    status: () => [...base, "mfa", "status"] as const,
  },

  delegations: {
    all: [...base, "delegations"] as const,
    received: (params: { cursor?: string; limit: number; search: string }) =>
      [...base, "delegations", "received", params] as const,
    given: (params: { cursor?: string; limit: number; search: string }) =>
      [...base, "delegations", "given", params] as const,
  },

  auth: {
    all: [...base, "auth"] as const,
    sessions: () => [...base, "auth", "sessions"] as const,
    loginHistory: (params?: Record<string, unknown>) =>
      [...base, "auth", "loginHistory", params] as const,
  },

  featureFlags: {
    all: [...base, "featureFlags"] as const,
    list: () => [...base, "featureFlags", "list"] as const,
    detail: (key: string) => [...base, "featureFlags", key] as const,
  },

} as const;
