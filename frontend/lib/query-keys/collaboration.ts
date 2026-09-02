import { queryKeyBase as base } from "./base";

export const collaborationQueryKeys = {
  chat: {
    all: [...base, "chat"] as const,
    myChannels: () => [...base, "chat", "myChannels"] as const,
    archivedChannels: () => [...base, "chat", "archivedChannels"] as const,
    publicChannels: () => [...base, "chat", "publicChannels"] as const,
    channel: (channelId: number) =>
      [...base, "chat", "channel", channelId] as const,
    messages: (channelId: number, cursor?: number) =>
      [...base, "chat", "messages", channelId, cursor] as const,
    poll: (channelId: number, since: string) =>
      [...base, "chat", "poll", channelId, since] as const,
    entityActions: (channelId: number, referenceKeys: string) =>
      [...base, "chat", "entityActions", channelId, referenceKeys] as const,
    entityActionOptions: (channelId: number, referenceKey: string) =>
      [...base, "chat", "entityActionOptions", channelId, referenceKey] as const,
    unreadTotal: () => [...base, "chat", "unreadTotal"] as const,
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
    attachment: (channelId: number, attachmentId: number) =>
      [...base, "chat", "attachment", channelId, attachmentId] as const,
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
    stats: () => [...base, "dashboard", "stats"] as const,
    recentProjects: () => [...base, "dashboard", "recentProjects"] as const,
    teamAttendance: () => [...base, "dashboard", "teamAttendance"] as const,
    leavesToday: () => [...base, "dashboard", "leavesToday"] as const,
    upcomingHolidays: () => [...base, "dashboard", "upcomingHolidays"] as const,
    myLeaveBalance: () => [...base, "dashboard", "myLeaveBalance"] as const,
    birthdays: () => [...base, "dashboard", "birthdays"] as const,
    pendingApprovals: () => [...base, "dashboard", "pendingApprovals"] as const,
    myIssues: () => [...base, "dashboard", "myIssues"] as const,
    todayActivities: () => [...base, "dashboard", "todayActivities"] as const,
    activeSprintSummary: () =>
      [...base, "dashboard", "activeSprintSummary"] as const,
    recentActivity: () => [...base, "dashboard", "recentActivity"] as const,
    announcements: () => [...base, "dashboard", "announcements"] as const,
    personal: () => [...base, "dashboard", "personal"] as const,
    executive: () => [...base, "dashboard", "executive"] as const,
    publicDocuments: (limit: number) =>
      [...base, "dashboard", "publicDocuments", limit] as const,
  },

} as const;
