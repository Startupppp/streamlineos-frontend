import { queryKeyBase as base } from "./base";

export const customerWorkQueryKeys = {
  leads: {
    all: [...base, "leads"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "leads", "list", params] as const,
    board: () => [...base, "leads", "board"] as const,
    detail: (leadId: number) => [...base, "leads", "detail", leadId] as const,
    stats: (params?: Record<string, unknown>) =>
      [...base, "leads", "stats", params] as const,
    activities: (leadId: number) =>
      [...base, "leads", "activities", leadId] as const,
    timeline: (leadId: number) =>
      [...base, "leads", "timeline", leadId] as const,
    slaAlerts: () => [...base, "leads", "slaAlerts"] as const,
    analyticsSummary: (params?: Record<string, unknown>) =>
      [...base, "leads", "analyticsSummary", params] as const,
    duplicates: () => [...base, "leads", "duplicates"] as const,
    sourceReport: () => [...base, "leads", "sourceReport"] as const,
  },

  deals: {
    all: [...base, "deals"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "deals", "list", params] as const,
    detail: (dealId: number) => [...base, "deals", "detail", dealId] as const,
    forecast: () => [...base, "deals", "forecast"] as const,
    stats: () => [...base, "deals", "stats"] as const,
    aging: () => [...base, "deals", "aging"] as const,
    winLoss: () => [...base, "deals", "winLoss"] as const,
    meetings: (dealId: number) =>
      [...base, "deals", "meetings", dealId] as const,
    approvals: (params?: Record<string, unknown>) =>
      [...base, "deals", "approvals", params] as const,
    competitors: (dealId: number) =>
      [...base, "deals", "competitors", dealId] as const,
    health: (dealId: number) => [...base, "deals", "health", dealId] as const,
    forecastSnapshots: (params?: Record<string, unknown>) =>
      [...base, "deals", "forecastSnapshots", params] as const,
    forecastCompare: (period: string) =>
      [...base, "deals", "forecastCompare", period] as const,
    forecastModel: () => [...base, "deals", "forecastModel"] as const,
    forecastScore: (dealId: number) => [...base, "deals", "forecastScore", dealId] as const,
    stakeholders: (dealId: number) =>
      [...base, "deals", "stakeholders", dealId] as const,
  },

  contacts: {
    all: [...base, "contacts"] as const,
    list: (params?: object) =>
      [...base, "contacts", "list", params] as const,
    detail: (contactId: number) =>
      [...base, "contacts", "detail", contactId] as const,
    search: (searchQuery: string) =>
      [...base, "contacts", "search", searchQuery] as const,
  },

  clients: {
    all: [...base, "clients"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "clients", "list", params] as const,
    detail: (clientId: number) => [...base, "clients", "detail", clientId] as const,
    activities: (clientId: number) =>
      [...base, "clients", "activities", clientId] as const,
    simpleList: () => [...base, "clients", "simpleList"] as const,
    timeline: (clientId: number) =>
      [...base, "clients", "timeline", clientId] as const,
  },

  clientOpportunities: {
    all: [...base, "clientOpportunities"] as const,
    list: (clientId?: number) =>
      [...base, "clientOpportunities", "list", clientId] as const,
  },

  clientOnboarding: {
    templates: () => [...base, "clientOnboarding", "templates"] as const,
    items: (clientId: number) =>
      [...base, "clientOnboarding", "items", clientId] as const,
  },

} as const;
