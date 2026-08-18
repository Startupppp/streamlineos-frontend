import { queryKeyBase as base } from "./base";

export const collaborationQueryKeys = {
  chat: {
    all: [...base, "chat"] as const,
    myChannels: (orgId?: string | null) =>
      orgId
        ? ([...base, "chat", "myChannels", orgId] as const)
        : ([...base, "chat", "myChannels"] as const),
    archivedChannels: () => [...base, "chat", "archivedChannels"] as const,
    publicChannels: () => [...base, "chat", "publicChannels"] as const,
    channel: (channelId: number) =>
      [...base, "chat", "channel", channelId] as const,
    messages: (channelId: number, cursor?: number) =>
      [...base, "chat", "messages", channelId, cursor] as const,
    poll: (channelId: number, since: string) =>
      [...base, "chat", "poll", channelId, since] as const,
    unreadTotal: (orgId?: string | null) =>
      orgId
        ? ([...base, "chat", "unreadTotal", orgId] as const)
        : ([...base, "chat", "unreadTotal"] as const),
    onlineUsers: () => [...base, "chat", "onlineUsers"] as const,
    orgUsers: () => [...base, "chat", "orgUsers"] as const,
    search: (query: string) => [...base, "chat", "search", query] as const,
    typing: (channelId: number) =>
      [...base, "chat", "typing", channelId] as const,
    pins: (channelId: number) => [...base, "chat", "pins", channelId] as const,
    thread: (channelId: number, messageId: number) =>
      [...base, "chat", "thread", channelId, messageId] as const,
    huddle: (channelId: number) =>
      [...base, "chat", "huddle", channelId] as const,
    savedMessages: () => [...base, "chat", "savedMessages"] as const,
    inviteLink: (channelId: number) =>
      [...base, "chat", "inviteLink", channelId] as const,
  },

  aiChat: {
    all: [...base, "aiChat"] as const,
    history: () => [...base, "aiChat", "history"] as const,
    conversations: () => [...base, "aiChat", "conversations"] as const,
    conversationMessages: (conversationId: number) =>
      [...base, "aiChat", "conversations", conversationId, "messages"] as const,
  },

  aiCrm: {
    leadSummary: (leadId: number) =>
      [...base, "ai", "crm", "lead-summary", leadId] as const,
    dealSummary: (dealId: number) =>
      [...base, "ai", "crm", "deal-summary", dealId] as const,
    nextBestActions: () => [...base, "ai", "crm", "next-best-actions"] as const,
    duplicateSuggestions: (leadId: number) =>
      [...base, "ai", "crm", "duplicate-suggestions", leadId] as const,
  },

  dashboard: {
    all: [...base, "dashboard"] as const,
    stats: (orgId: string) => [...base, "dashboard", "stats", orgId] as const,
    recentProjects: (orgId: string) =>
      [...base, "dashboard", "recentProjects", orgId] as const,
    teamAttendance: (orgId: string) =>
      [...base, "dashboard", "teamAttendance", orgId] as const,
    leavesToday: (orgId: string) =>
      [...base, "dashboard", "leavesToday", orgId] as const,
    upcomingHolidays: (orgId: string) =>
      [...base, "dashboard", "upcomingHolidays", orgId] as const,
    myLeaveBalance: (orgId: string) =>
      [...base, "dashboard", "myLeaveBalance", orgId] as const,
    birthdays: (orgId: string) =>
      [...base, "dashboard", "birthdays", orgId] as const,
    pendingApprovals: (orgId: string) =>
      [...base, "dashboard", "pendingApprovals", orgId] as const,
    myIssues: () => [...base, "dashboard", "myIssues"] as const,
    activeSprintSummary: (orgId: string) =>
      [...base, "dashboard", "activeSprintSummary", orgId] as const,
    recentActivity: (orgId: string) =>
      [...base, "dashboard", "recentActivity", orgId] as const,
    announcements: (orgId: string) =>
      [...base, "dashboard", "announcements", orgId] as const,
    personal: (orgId: string) =>
      [...base, "dashboard", "personal", orgId] as const,
    executive: (orgId: string) =>
      [...base, "dashboard", "executive", orgId] as const,
    publicDocuments: (orgId: string, limit: number) =>
      [...base, "dashboard", "publicDocuments", orgId, limit] as const,
  },

} as const;
