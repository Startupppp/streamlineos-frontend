/**
 * Typed query key factory for all TanStack Query hooks.
 * Centralised here so invalidation is always consistent.
 *
 * Usage:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
 *   queryKey: queryKeys.leads.list(filters)
 */

const base = ["vaivamm"] as const;

export const queryKeys = {
  // ─── HR ────────────────────────────────────────────────────────────────────
  hr: {
    all: [...base, "hr"] as const,
    departments: () => [...base, "hr", "departments"] as const,
    employees: (params?: Record<string, unknown>) => [...base, "hr", "employees", params] as const,
    employee: (id: string) => [...base, "hr", "employees", id] as const,
    attendanceStatus: () => [...base, "hr", "attendanceStatus"] as const,
    attendanceLogs: (params?: Record<string, unknown>) => [...base, "hr", "attendanceLogs", params] as const,
    leaves: (params?: Record<string, unknown>) => [...base, "hr", "leaves", params] as const,
    leaveBalance: (userId?: string) => [...base, "hr", "leaveBalance", userId] as const,
    payrolls: (params?: Record<string, unknown>) => [...base, "hr", "payrolls", params] as const,
    salaryStructures: (userId?: string) => [...base, "hr", "salaryStructures", userId] as const,
    expenses: (params?: Record<string, unknown>) => [...base, "hr", "expenses", params] as const,
    assets: (params?: Record<string, unknown>) => [...base, "hr", "assets", params] as const,
    documents: (params?: Record<string, unknown>) => [...base, "hr", "documents", params] as const,
    performanceReviews: (userId?: string) => [...base, "hr", "performanceReviews", userId] as const,
    goals: (userId?: string) => [...base, "hr", "goals", userId] as const,
    workLogs: (params?: Record<string, unknown>) => [...base, "hr", "workLogs", params] as const,
    incentives: (params?: Record<string, unknown>) => [...base, "hr", "incentives", params] as const,
    incentiveStats: () => [...base, "hr", "incentiveStats"] as const,
    incentiveConfigs: () => [...base, "hr", "incentiveConfigs"] as const,
    orgChart: () => [...base, "hr", "orgChart"] as const,
    helpdeskTickets: (params?: Record<string, unknown>) => [...base, "hr", "helpdeskTickets", params] as const,
    wfhRequests: () => [...base, "hr", "wfhRequests"] as const,
    pendingWfhRequests: () => [...base, "hr", "pendingWfhRequests"] as const,
    holidaysYear: (year: number) => [...base, "hr", "holidaysYear", year] as const,
    holidaysCalendar: (params: { year: number; month: number }) => [...base, "hr", "holidaysCalendar", params] as const,
    devices: (params?: Record<string, unknown>) => [...base, "hr", "devices", params] as const,
    monthlyAttendance: (params: { userId: string; year: number; month: number }) => [...base, "hr", "monthlyAttendance", params] as const,
    employeeStats: (userId: string) => [...base, "hr", "employeeStats", userId] as const,
    employeePayslips: (userId?: string) => [...base, "hr", "employeePayslips", userId] as const,
  },

  // ─── Leads / CRM ───────────────────────────────────────────────────────────
  leads: {
    all: [...base, "leads"] as const,
    list: (params?: Record<string, unknown>) => [...base, "leads", "list", params] as const,
    board: () => [...base, "leads", "board"] as const,
    detail: (id: number) => [...base, "leads", "detail", id] as const,
    stats: (params?: Record<string, unknown>) => [...base, "leads", "stats", params] as const,
    activities: (leadId: number) => [...base, "leads", "activities", leadId] as const,
    timeline: (leadId: number) => [...base, "leads", "timeline", leadId] as const,
    slaAlerts: () => [...base, "leads", "slaAlerts"] as const,
    analyticsSummary: (params?: Record<string, unknown>) => [...base, "leads", "analyticsSummary", params] as const,
    dashboardMetrics: () => [...base, "leads", "dashboardMetrics"] as const,
    unverified: () => [...base, "leads", "unverified"] as const,
  },

  deals: {
    all: [...base, "deals"] as const,
    list: (params?: Record<string, unknown>) => [...base, "deals", "list", params] as const,
    detail: (id: number) => [...base, "deals", "detail", id] as const,
    pipeline: (params?: Record<string, unknown>) => [...base, "deals", "pipeline", params] as const,
  },

  contacts: {
    all: [...base, "contacts"] as const,
    list: (params?: Record<string, unknown>) => [...base, "contacts", "list", params] as const,
    detail: (id: number) => [...base, "contacts", "detail", id] as const,
  },

  clients: {
    all: [...base, "clients"] as const,
    list: (params?: Record<string, unknown>) => [...base, "clients", "list", params] as const,
    detail: (id: number) => [...base, "clients", "detail", id] as const,
    activities: (id: number) => [...base, "clients", "activities", id] as const,
  },

  targets: {
    all: [...base, "targets"] as const,
    list: (params?: Record<string, unknown>) => [...base, "targets", "list", params] as const,
    myTargets: () => [...base, "targets", "myTargets"] as const,
    leaderboard: (metricType?: string) => [...base, "targets", "leaderboard", metricType] as const,
    history: (targetId: number) => [...base, "targets", "history", targetId] as const,
  },

  // ─── Projects ──────────────────────────────────────────────────────────────
  projects: {
    all: [...base, "projects"] as const,
    list: () => [...base, "projects", "list"] as const,
    detail: (id: number) => [...base, "projects", "detail", id] as const,
    sprints: (projectId?: number) => [...base, "projects", "sprints", projectId] as const,
    sprint: (id: number) => [...base, "projects", "sprints", "detail", id] as const,
    tickets: (params?: Record<string, unknown>) => [...base, "projects", "tickets", params] as const,
    ticket: (id: number) => [...base, "projects", "tickets", "detail", id] as const,
    members: (projectId?: number) => [...base, "projects", "members", projectId] as const,
    labels: (projectId?: number) => [...base, "projects", "labels", projectId] as const,
    timeEntries: (params?: Record<string, unknown>) => [...base, "projects", "timeEntries", params] as const,
    burndown: (sprintId: number) => [...base, "projects", "burndown", sprintId] as const,
    epics: (projectId: number) => [...base, "projects", "epics", projectId] as const,
    cycles: (projectId: number) => [...base, "projects", "cycles", projectId] as const,
    modules: (projectId: number) => [...base, "projects", "modules", projectId] as const,
    pages: (projectId: number) => [...base, "projects", "pages", projectId] as const,
    views: (projectId: number) => [...base, "projects", "views", projectId] as const,
    intake: (projectId: number) => [...base, "projects", "intake", projectId] as const,
    analytics: (projectId: number) => [...base, "projects", "analytics", projectId] as const,
    watchers: (ticketId: number) => [...base, "projects", "watchers", ticketId] as const,
  },

  // ─── Chat ──────────────────────────────────────────────────────────────────
  chat: {
    all: [...base, "chat"] as const,
    myChannels: () => [...base, "chat", "myChannels"] as const,
    channel: (id: number) => [...base, "chat", "channel", id] as const,
    messages: (channelId: number, cursor?: number) => [...base, "chat", "messages", channelId, cursor] as const,
    poll: (channelId: number, since: string) => [...base, "chat", "poll", channelId, since] as const,
    unreadTotal: () => [...base, "chat", "unreadTotal"] as const,
    onlineUsers: () => [...base, "chat", "onlineUsers"] as const,
    orgUsers: () => [...base, "chat", "orgUsers"] as const,
    search: (query: string) => [...base, "chat", "search", query] as const,
    typing: (channelId: number) => [...base, "chat", "typing", channelId] as const,
  },

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: {
    all: [...base, "dashboard"] as const,
    stats: () => [...base, "dashboard", "stats"] as const,
    recentProjects: () => [...base, "dashboard", "recentProjects"] as const,
    teamAvailability: () => [...base, "dashboard", "teamAvailability"] as const,
    myIssues: (userId: string) => [...base, "dashboard", "myIssues", userId] as const,
    activeSprintSummary: () => [...base, "dashboard", "activeSprintSummary"] as const,
    recentActivity: () => [...base, "dashboard", "recentActivity"] as const,
  },

  // ─── Reports ───────────────────────────────────────────────────────────────
  reports: {
    all: [...base, "reports"] as const,
    attendance: (params?: Record<string, unknown>) => [...base, "reports", "attendance", params] as const,
    payroll: (params?: Record<string, unknown>) => [...base, "reports", "payroll", params] as const,
    project: (params?: Record<string, unknown>) => [...base, "reports", "project", params] as const,
    teamPerformance: (params?: Record<string, unknown>) => [...base, "reports", "teamPerformance", params] as const,
    dashboardStats: () => [...base, "reports", "dashboardStats"] as const,
  },

  // ─── Other domains ─────────────────────────────────────────────────────────
  notifications: {
    all: [...base, "notifications"] as const,
    list: (unreadOnly?: boolean) => [...base, "notifications", "list", unreadOnly] as const,
    unreadCount: () => [...base, "notifications", "unreadCount"] as const,
  },

  invoice: {
    all: [...base, "invoice"] as const,
    list: (params?: Record<string, unknown>) => [...base, "invoice", "list", params] as const,
    detail: (id: number) => [...base, "invoice", "detail", id] as const,
    stats: () => [...base, "invoice", "stats"] as const,
  },

  support: {
    all: [...base, "support"] as const,
    list: (params?: Record<string, unknown>) => [...base, "support", "list", params] as const,
    detail: (id: number) => [...base, "support", "detail", id] as const,
  },

  organization: {
    all: [...base, "organization"] as const,
    members: () => [...base, "organization", "members"] as const,
    invitations: () => [...base, "organization", "invitations"] as const,
    settings: () => [...base, "organization", "settings"] as const,
  },

  rbac: {
    all: [...base, "rbac"] as const,
    userPermissions: () => [...base, "rbac", "userPermissions"] as const,
    allPermissions: () => [...base, "rbac", "allPermissions"] as const,
    rolePermissions: (role: string) => [...base, "rbac", "rolePermissions", role] as const,
  },

  roles: {
    all: [...base, "roles"] as const,
    list: () => [...base, "roles", "list"] as const,
    detail: (id: number) => [...base, "roles", "detail", id] as const,
  },

  branches: {
    all: [...base, "branches"] as const,
    list: () => [...base, "branches", "list"] as const,
    detail: (id: number) => [...base, "branches", "detail", id] as const,
  },

  crm: {
    all: [...base, "crm"] as const,
    salesDashboard: () => [...base, "crm", "salesDashboard"] as const,
    marketingDashboard: () => [...base, "crm", "marketingDashboard"] as const,
    supportDashboard: () => [...base, "crm", "supportDashboard"] as const,
    customerExecutiveDashboard: () => [...base, "crm", "customerExecutiveDashboard"] as const,
    person: (slug: string) => [...base, "crm", "person", slug] as const,
    peopleSlugs: () => [...base, "crm", "peopleSlugs"] as const,
  },

  crmSettings: {
    all: [...base, "crmSettings"] as const,
    assignmentRules: () => [...base, "crmSettings", "assignmentRules"] as const,
    emailTemplates: (params?: Record<string, unknown>) => [...base, "crmSettings", "emailTemplates", params] as const,
    scoringRules: () => [...base, "crmSettings", "scoringRules"] as const,
    slaPolicies: () => [...base, "crmSettings", "slaPolicies"] as const,
    slaReport: () => [...base, "crmSettings", "slaReport"] as const,
    slaBreachedLeads: (params?: Record<string, unknown>) => [...base, "crmSettings", "slaBreachedLeads", params] as const,
  },

  crmOrganizations: {
    all: [...base, "crmOrganizations"] as const,
    list: (params?: Record<string, unknown>) => [...base, "crmOrganizations", "list", params] as const,
    detail: (id: number) => [...base, "crmOrganizations", "detail", id] as const,
  },

  clientStats: {
    all: [...base, "clientStats"] as const,
    stats: () => [...base, "clientStats", "stats"] as const,
  },

  dealActivities: {
    all: [...base, "dealActivities"] as const,
    list: (dealId: number, params?: Record<string, unknown>) => [...base, "dealActivities", "list", dealId, params] as const,
  },

  salesTeamCapacity: {
    all: [...base, "salesTeamCapacity"] as const,
    list: () => [...base, "salesTeamCapacity", "list"] as const,
  },

  salesLeaderboard: {
    all: [...base, "salesLeaderboard"] as const,
    list: () => [...base, "salesLeaderboard", "list"] as const,
  },

  dmLeads: {
    all: [...base, "dmLeads"] as const,
    list: (params?: Record<string, unknown>) => [...base, "dmLeads", "list", params] as const,
    detail: (id: number) => [...base, "dmLeads", "detail", id] as const,
  },

  dmCampaigns: {
    all: [...base, "dmCampaigns"] as const,
    list: (params?: Record<string, unknown>) => [...base, "dmCampaigns", "list", params] as const,
    detail: (id: number) => [...base, "dmCampaigns", "detail", id] as const,
  },

  socialMedia: {
    all: [...base, "socialMedia"] as const,
    latest: () => [...base, "socialMedia", "latest"] as const,
  },

  auditLog: {
    all: [...base, "auditLog"] as const,
    list: (params?: Record<string, unknown>) => [...base, "auditLog", "list", params] as const,
    actions: () => [...base, "auditLog", "actions"] as const,
    targetTypes: () => [...base, "auditLog", "targetTypes"] as const,
  },

  sessions: {
    all: [...base, "sessions"] as const,
    list: () => [...base, "sessions", "list"] as const,
  },

  globalSearch: {
    all: [...base, "globalSearch"] as const,
    results: (query: string) => [...base, "globalSearch", query] as const,
  },
} as const;
