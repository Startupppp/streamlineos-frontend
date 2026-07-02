

const base = ["streamlineos"] as const;

export const queryKeys = {

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
    orgChart: () => [...base, "hr", "orgChart"] as const,
    wfhRequests: () => [...base, "hr", "wfhRequests"] as const,
    pendingWfhRequests: () => [...base, "hr", "pendingWfhRequests"] as const,
    holidaysYear: (year: number) => [...base, "hr", "holidaysYear", year] as const,
    holidaysCalendar: (params: { year: number; month: number }) => [...base, "hr", "holidaysCalendar", params] as const,
    monthlyAttendance: (params: { userId: string; year: number; month: number }) => [...base, "hr", "monthlyAttendance", params] as const,
    attendanceHeatmap: (params: { userId: string; year: number }) => [...base, "hr", "attendanceHeatmap", params] as const,
    employeeStats: (userId: string) => [...base, "hr", "employeeStats", userId] as const,
    employeePayslips: (userId?: string) => [...base, "hr", "employeePayslips", userId] as const,

    recruitmentStats: () => [...base, "hr", "recruitmentStats"] as const,
    jobPostings: (params?: Record<string, unknown>) => [...base, "hr", "jobPostings", params] as const,
    jobPosting: (id: number) => [...base, "hr", "jobPosting", id] as const,
    candidates: (params?: Record<string, unknown>) => [...base, "hr", "candidates", params] as const,
    candidate: (id: number) => [...base, "hr", "candidate", id] as const,
    interviews: (params?: Record<string, unknown>) => [...base, "hr", "interviews", params] as const,
    recruitmentPipeline: () => [...base, "hr", "recruitmentPipeline"] as const,
    scorecardTemplates: () => [...base, "hr", "scorecardTemplates"] as const,
    interviewScorecard: (interviewId: number) => [...base, "hr", "interviewScorecard", interviewId] as const,
    interviewerPerformance: (days: number) => [...base, "hr", "interviewerPerformance", days] as const,
    interviewScorecardSummary: (interviewId: number) => [...base, "hr", "interviewScorecardSummary", interviewId] as const,
    candidateVault: (candidateId: number) => [...base, "hr", "candidateVault", candidateId] as const,
    reviewCycles: () => [...base, "hr", "reviewCycles"] as const,
    reviewCycle: (id: number) => [...base, "hr", "reviewCycle", id] as const,
    oneOnOnes: (params?: Record<string, unknown>) => [...base, "hr", "oneOnOnes", params] as const,
    terminations: () => [...base, "hr", "terminations"] as const,
    termination: (id: number) => [...base, "hr", "termination", id] as const,
    documentTypes: () => [...base, "hr", "documentTypes"] as const,
    onboardingDocsAll: [...base, "hr", "onboardingDocs"] as const,
    onboardingDocs: (userId?: string) => [...base, "hr", "onboardingDocs", userId] as const,
    onboardingDocsSummary: () => [...base, "hr", "onboardingDocs", "summary"] as const,
    myOnboardingDocs: () => [...base, "hr", "myOnboardingDocs"] as const,
    teams: (teamId?: string) => [...base, "hr", "teams", teamId] as const,
    diversityReport: () => [...base, "hr", "diversityReport"] as const,
    bookingLinks: () => [...base, "hr", "bookingLinks"] as const,
    documentTemplates: (params?: Record<string, unknown>) => [...base, "hr", "documentTemplates", params] as const,
    documentTemplate: (id: number) => [...base, "hr", "documentTemplate", id] as const,
    candidateDocuments: (candidateId: number) => [...base, "hr", "candidateDocuments", candidateId] as const,
    rolloutDocuments: (candidateId: number) => [...base, "hr", "rolloutDocuments", candidateId] as const,
    leavesMyOwn: () => [...base, "hr", "leaves", "my"] as const,
    leavesTeam: () => [...base, "hr", "leaves", "team"] as const,
    leavesThisWeek: () => [...base, "hr", "leavesThisWeek"] as const,
    leavesMyRequests: () => [...base, "hr", "leavesMyRequests"] as const,
    dashboardMetrics: () => [...base, "hr", "dashboard", "metrics"] as const,
    headcountTrends: () => [...base, "hr", "dashboard", "headcountTrends"] as const,
    leaveCalendar: (month: number, year: number) => [...base, "hr", "leaveCalendar", month, year] as const,
    headcount: (groupBy: string) => [...base, "hr", "headcount", groupBy] as const,
    dashboardOnboardingStatus: () => [...base, "hr", "dashboard", "onboardingStatus"] as const,
    dashboardDiversity: () => [...base, "hr", "dashboard", "diversity"] as const,
    dashboardTimeToFill: () => [...base, "hr", "dashboard", "timeToFill"] as const,
    dashboardPayrollSummary: () => [...base, "hr", "dashboard", "payrollSummary"] as const,
    dashboardSalaryBands: () => [...base, "hr", "dashboard", "salaryBands"] as const,
    directory: () => [...base, "hr", "directory"] as const,
    onboardingAll: [...base, "hr", "onboarding"] as const,
    onboardingStatus: () => [...base, "hr", "onboarding", "status"] as const,
    onboardingUser: (userId: string) => [...base, "hr", "onboarding", "user", userId] as const,
    onboardingTemplates: () => [...base, "hr", "onboarding", "templates"] as const,
    candidateSla: (candidateId: number) => [...base, "hr", "candidateSla", candidateId] as const,
    atsKanban: () => [...base, "hr", "atsKanban"] as const,
    interviewSlas: () => [...base, "hr", "interviewSlas"] as const,
    slaReport: () => [...base, "hr", "slaReport"] as const,
    hiringFlows: () => [...base, "hr", "hiringFlows"] as const,
    hiringFlow: (id: number) => [...base, "hr", "hiringFlow", id] as const,
    hiringFlowRounds: (flowId: number) => [...base, "hr", "hiringFlowRounds", flowId] as const,
    emailSequences: () => [...base, "hr", "emailSequences"] as const,
    emailSequence: (id: number) => [...base, "hr", "emailSequence", id] as const,
    pipelineAutomations: () => [...base, "hr", "pipelineAutomations"] as const,
    referrals: () => [...base, "hr", "referrals"] as const,
    offerTemplates: () => [...base, "hr", "offerTemplates"] as const,
    scorecardAnalytics: (params?: Record<string, unknown>) => [...base, "hr", "scorecardAnalytics", params] as const,
    headcountRequests: (params?: Record<string, unknown>) => [...base, "hr", "headcountRequests", params] as const,
    recruitmentVendors: () => [...base, "hr", "recruitmentVendors"] as const,
    vendorSubmissions: (vendorId: number) => [...base, "hr", "vendorSubmissions", vendorId] as const,
    candidateMessages: (candidateId?: number) => [...base, "hr", "candidateMessages", candidateId] as const,
    messageThreads: () => [...base, "hr", "messageThreads"] as const,
    recruiters: () => [...base, "hr", "recruiters"] as const,
    jobRecruiters: (jobId: number) => [...base, "hr", "jobRecruiters", jobId] as const,
    recruiterActivity: (params?: Record<string, unknown>) => [...base, "hr", "recruiterActivity", params] as const,
    scheduledReports: () => [...base, "hr", "scheduledReports"] as const,
    kpis: (params?: Record<string, unknown>) => [...base, "hr", "kpis", params] as const,
    competencyFrameworks: () => [...base, "hr", "competencyFrameworks"] as const,
    feedbackCycles: () => [...base, "hr", "feedbackCycles"] as const,
    feedbackCycle: (id: number) => [...base, "hr", "feedbackCycle", id] as const,
    myPendingReviews: () => [...base, "hr", "myPendingReviews"] as const,
    feedbackResults: (subjectId: string) => [...base, "hr", "feedbackResults", subjectId] as const,
  },

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
    duplicates: () => [...base, "leads", "duplicates"] as const,
    sourceReport: () => [...base, "leads", "sourceReport"] as const,
  },

  deals: {
    all: [...base, "deals"] as const,
    list: (params?: Record<string, unknown>) => [...base, "deals", "list", params] as const,
    detail: (id: number) => [...base, "deals", "detail", id] as const,
    forecast: () => [...base, "deals", "forecast"] as const,
    stats: () => [...base, "deals", "stats"] as const,
    aging: () => [...base, "deals", "aging"] as const,
    winLoss: () => [...base, "deals", "winLoss"] as const,
    meetings: (dealId: number) => [...base, "deals", "meetings", dealId] as const,
  },

  contacts: {
    all: [...base, "contacts"] as const,
    list: (params?: Record<string, unknown>) => [...base, "contacts", "list", params] as const,
    detail: (id: number) => [...base, "contacts", "detail", id] as const,
    search: (q: string) => [...base, "contacts", "search", q] as const,
  },

  clients: {
    all: [...base, "clients"] as const,
    list: (params?: Record<string, unknown>) => [...base, "clients", "list", params] as const,
    detail: (id: number) => [...base, "clients", "detail", id] as const,
    activities: (id: number) => [...base, "clients", "activities", id] as const,
    crmStats: () => [...base, "clients", "crmStats"] as const,
    simpleList: () => [...base, "clients", "simpleList"] as const,
  },

  clientOpportunities: {
    all: [...base, "clientOpportunities"] as const,
    list: (clientId?: number) => [...base, "clientOpportunities", "list", clientId] as const,
  },

  clientOnboarding: {
    templates: () => [...base, "clientOnboarding", "templates"] as const,
    items: (clientId: number) => [...base, "clientOnboarding", "items", clientId] as const,
  },

  projects: {
    all: [...base, "projects"] as const,
    list: (filters?: Record<string, unknown>) => [...base, "projects", "list", filters] as const,
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
    budget: (projectId: number) => [...base, "projects", "budget", projectId] as const,
    resourceAllocation: () => [...base, "projects", "resourceAllocation"] as const,
    templates: () => [...base, "projects", "templates"] as const,
  },

  chat: {
    all: [...base, "chat"] as const,
    myChannels: () => [...base, "chat", "myChannels"] as const,
    archivedChannels: () => [...base, "chat", "archivedChannels"] as const,
    publicChannels: () => [...base, "chat", "publicChannels"] as const,
    channel: (id: number) => [...base, "chat", "channel", id] as const,
    messages: (channelId: number, cursor?: number) => [...base, "chat", "messages", channelId, cursor] as const,
    poll: (channelId: number, since: string) => [...base, "chat", "poll", channelId, since] as const,
    unreadTotal: () => [...base, "chat", "unreadTotal"] as const,
    onlineUsers: () => [...base, "chat", "onlineUsers"] as const,
    orgUsers: () => [...base, "chat", "orgUsers"] as const,
    search: (query: string) => [...base, "chat", "search", query] as const,
    typing: (channelId: number) => [...base, "chat", "typing", channelId] as const,
    pins: (channelId: number) => [...base, "chat", "pins", channelId] as const,
    thread: (channelId: number, messageId: number) => [...base, "chat", "thread", channelId, messageId] as const,
    huddle: (channelId: number) => [...base, "chat", "huddle", channelId] as const,
    savedMessages: () => [...base, "chat", "savedMessages"] as const,
  },

  dashboard: {
    all: [...base, "dashboard"] as const,
    stats: () => [...base, "dashboard", "stats"] as const,
    recentProjects: () => [...base, "dashboard", "recentProjects"] as const,
    teamAvailability: () => [...base, "dashboard", "teamAvailability"] as const,
    myIssues: (userId: string) => [...base, "dashboard", "myIssues", userId] as const,
    activeSprintSummary: () => [...base, "dashboard", "activeSprintSummary"] as const,
    recentActivity: () => [...base, "dashboard", "recentActivity"] as const,
    announcements: () => [...base, "dashboard", "announcements"] as const,
    personal: () => [...base, "dashboard", "personal"] as const,
    executive: () => [...base, "dashboard", "executive"] as const,
    manager: () => [...base, "dashboard", "manager"] as const,
    publicDocuments: (limit: number) => [...base, "dashboard", "publicDocuments", limit] as const,
  },

  reports: {
    all: [...base, "reports"] as const,
    attendance: (params?: Record<string, unknown>) => [...base, "reports", "attendance", params] as const,
    payroll: (params?: Record<string, unknown>) => [...base, "reports", "payroll", params] as const,
    project: (params?: Record<string, unknown>) => [...base, "reports", "project", params] as const,
    teamPerformance: (params?: Record<string, unknown>) => [...base, "reports", "teamPerformance", params] as const,
    dashboardStats: () => [...base, "reports", "dashboardStats"] as const,
  },

  notifications: {
    all: [...base, "notifications"] as const,
    list: (params?: Record<string, unknown>) => [...base, "notifications", "list", params] as const,
    unreadCount: () => [...base, "notifications", "unreadCount"] as const,
    preferences: () => [...base, "notifications", "preferences"] as const,
    templates: (params?: Record<string, unknown>) => [...base, "notifications", "templates", params] as const,
    template: (id: number) => [...base, "notifications", "template", id] as const,
    broadcasts: (params?: Record<string, unknown>) => [...base, "notifications", "broadcasts", params] as const,
    broadcast: (id: number) => [...base, "notifications", "broadcast", id] as const,
    analytics: (days?: number) => [...base, "notifications", "analytics", days] as const,
    queue: () => [...base, "notifications", "queue"] as const,
    queueFailed: () => [...base, "notifications", "queueFailed"] as const,
    auditLogs: (params?: Record<string, unknown>) => [...base, "notifications", "auditLogs", params] as const,
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

  access: {
    all: [...base, "access"] as const,
    me: () => [...base, "access", "me"] as const,
    simulate: (userId: string) => [...base, "access", "simulate", userId] as const,
    resourceGrants: (resourceType: string, resourceId: string) => [...base, "access", "resource-grants", resourceType, resourceId] as const,
    orgModules: () => [...base, "access", "org-modules"] as const,
  },

  roles: {
    all: [...base, "roles"] as const,
    list: () => [...base, "roles", "list"] as const,
    detail: (id: number) => [...base, "roles", "detail", id] as const,
    permissions: (roleId: number) => [...base, "roles", "permissions", roleId] as const,
    permissionsMatrix: () => [...base, "roles", "permissions", "matrix"] as const,
    members: (roleId: number) => [...base, "roles", "members", roleId] as const,
    analytics: () => [...base, "roles", "analytics"] as const,
  },

  branches: {
    all: [...base, "branches"] as const,
    list: () => [...base, "branches", "list"] as const,
    detail: (id: number) => [...base, "branches", "detail", id] as const,
  },

  crm: {
    all: [...base, "crm"] as const,
    salesDashboard: () => [...base, "crm", "salesDashboard"] as const,
    salesKpis: (params: Record<string, unknown>) => [...base, "crm", "salesKpis", params] as const,
    salesFunnel: (params: Record<string, unknown>) => [...base, "crm", "salesFunnel", params] as const,
    salesLeaderboard: (params: Record<string, unknown>) => [...base, "crm", "salesLeaderboard", params] as const,
    revenueVsGoal: (year: number) => [...base, "crm", "revenueVsGoal", year] as const,
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
    hierarchy: (id: number) => [...base, "crmOrganizations", "hierarchy", id] as const,
    rollup: (id: number) => [...base, "crmOrganizations", "rollup", id] as const,
    timeline: (id: number) => [...base, "crmOrganizations", "timeline", id] as const,
    relatedLeads: (id: number) => [...base, "crmOrganizations", "relatedLeads", id] as const,
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

  salesQuotas: {
    all: [...base, "salesQuotas"] as const,
    list: (params?: Record<string, unknown>) => [...base, "salesQuotas", "list", params] as const,
  },

  salesLeaderboard: {
    all: [...base, "salesLeaderboard"] as const,
    list: () => [...base, "salesLeaderboard", "list"] as const,
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

  tasks: {
    all: [...base, "tasks"] as const,
    list: (params?: Record<string, unknown>) => [...base, "tasks", "list", params] as const,
    detail: (id: number) => [...base, "tasks", "detail", id] as const,
    myQueue: () => [...base, "tasks", "myQueue"] as const,
    overdue: () => [...base, "tasks", "overdue"] as const,
    overdueCount: () => [...base, "tasks", "overdueCount"] as const,
    sequences: () => [...base, "tasks", "sequences"] as const,
  },

  crmActivities: {
    all: [...base, "crmActivities"] as const,
    list: (params?: Record<string, unknown>) => [...base, "crmActivities", "list", params] as const,
  },

  blog: {
    all: [...base, "blog"] as const,
    feed: <P extends object>(params?: P) => [...base, "blog", "feed", params] as const,
  },

  publicBooking: {
    all: [...base, "publicBooking"] as const,
    detail: (token: string) => [...base, "publicBooking", "detail", token] as const,
  },

  accounting: {
    all: [...base, "accounting"] as const,
    accounts: <P extends object>(params?: P) => [...base, "accounting", "accounts", params] as const,
    journal: <P extends object>(params?: P) => [...base, "accounting", "journal", params] as const,
    journalEntry: (id: number) => [...base, "accounting", "journalEntry", id] as const,
    trialBalance: (asOf: string) => [...base, "accounting", "trialBalance", asOf] as const,
    profitLoss: (from: string, to: string) => [...base, "accounting", "profitLoss", from, to] as const,
    customersOutstanding: <P extends object>(params?: P) => [...base, "accounting", "customersOutstanding", params] as const,
    customerLedger: <P extends object>(clientId: number, params?: P) => [...base, "accounting", "customerLedger", clientId, params] as const,
    gstr1: (params: { from: string; to: string }) => [...base, "accounting", "gstr1", params] as const,
    balanceSheet: (params: { asOf: string }) => [...base, "accounting", "balanceSheet", params] as const,
    agedReceivables: (params: { asOf: string }) => [...base, "accounting", "agedReceivables", params] as const,
    purchaseBills: <P extends object>(params?: P) => [...base, "accounting", "purchaseBills", params] as const,
    purchaseBill: (id: number) => [...base, "accounting", "purchaseBill", id] as const,
    gstr3B: (params: { from: string; to: string }) => [...base, "accounting", "gstr3B", params] as const,
    vendorsOutstanding: <P extends object>(params?: P) => [...base, "accounting", "vendorsOutstanding", params] as const,
    vendorLedger: <P extends object>(vendorId: number, params?: P) => [...base, "accounting", "vendorLedger", vendorId, params] as const,
    agedPayables: (params: { asOf: string }) => [...base, "accounting", "agedPayables", params] as const,
    cashFlow: (params: { from: string; to: string }) => [...base, "accounting", "cashFlow", params] as const,
  },

  recurringInvoices: {
    all: [...base, "recurringInvoices"] as const,
    list: (params?: Record<string, unknown>) => [...base, "recurringInvoices", "list", params] as const,
    due: () => [...base, "recurringInvoices", "due"] as const,
  },

  goals: {
    all: [...base, "goals"] as const,
    list: (params?: Record<string, unknown>) => [...base, "goals", "list", params] as const,
    detail: (id: number) => [...base, "goals", "detail", id] as const,
    stats: () => [...base, "goals", "stats"] as const,
  },

  projectReports: {
    all: [...base, "projectReports"] as const,
    velocity: (projectId: number) => [...base, "projectReports", "velocity", projectId] as const,
    burnup: (projectId: number, sprintId?: number) => [...base, "projectReports", "burnup", projectId, sprintId] as const,
    cfd: (projectId: number, params?: Record<string, unknown>) => [...base, "projectReports", "cfd", projectId, params] as const,
    criticalPath: (projectId: number) => [...base, "projectReports", "criticalPath", projectId] as const,
    cycleTime: (projectId: number) => [...base, "projectReports", "cycleTime", projectId] as const,
    leadTime: (projectId: number) => [...base, "projectReports", "leadTime", projectId] as const,
  },

  whiteboards: {
    all: [...base, "whiteboards"] as const,
    list: (projectId: number) => [...base, "whiteboards", "list", projectId] as const,
    detail: (id: number) => [...base, "whiteboards", "detail", id] as const,
  },

  gitIntegration: {
    all: [...base, "gitIntegration"] as const,
    connections: () => [...base, "gitIntegration", "connections"] as const,
    ticketLinks: (ticketId: number) => [...base, "gitIntegration", "ticketLinks", ticketId] as const,
  },

  ticketActivity: {
    all: [...base, "ticketActivity"] as const,
    list: (ticketId: number) => [...base, "ticketActivity", "list", ticketId] as const,
  },

  supportActivity: {
    all: [...base, "supportActivity"] as const,
    list: (ticketId: number) => [...base, "supportActivity", "list", ticketId] as const,
  },

  kbComments: {
    all: [...base, "kbComments"] as const,
    list: (articleId: number) => [...base, "kbComments", "list", articleId] as const,
  },

  kbAttachments: {
    all: [...base, "kbAttachments"] as const,
    list: (articleId: number) => [...base, "kbAttachments", "list", articleId] as const,
    publicList: (orgId: string, slug: string) => [...base, "kbAttachments", "publicList", orgId, slug] as const,
  },

  playbook: {
    all: [...base, "playbook"] as const,
    list: (params?: Record<string, unknown>) => [...base, "playbook", "list", params] as const,
  },

  kb: {
    all: [...base, "kb"] as const,
    spaces: () => [...base, "kb", "spaces"] as const,
    space: (spaceId: number) => [...base, "kb", "space", spaceId] as const,
    spaceCategories: (spaceId: number) => [...base, "kb", "spaceCategories", spaceId] as const,
    spaceMembers: (spaceId: number) => [...base, "kb", "spaceMembers", spaceId] as const,
    categories: () => [...base, "kb", "categories"] as const,
    articles: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "kb", "articles"] as const)
        : ([...base, "kb", "articles", params] as const),
    article: (articleId: number) => [...base, "kb", "article", articleId] as const,
    publicArticles: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "kb", "publicArticles"] as const)
        : ([...base, "kb", "publicArticles", params] as const),
    publicArticle: (orgId: string, slug: string) => [...base, "kb", "publicArticle", orgId, slug] as const,
    search: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "kb", "search"] as const)
        : ([...base, "kb", "search", params] as const),
    ask: () => [...base, "kb", "ask"] as const,
    analyticsOverview: (range?: Record<string, unknown>) =>
      range === undefined
        ? ([...base, "kb", "analyticsOverview"] as const)
        : ([...base, "kb", "analyticsOverview", range] as const),
    noResults: (range?: Record<string, unknown>) =>
      range === undefined
        ? ([...base, "kb", "noResults"] as const)
        : ([...base, "kb", "noResults", range] as const),
    verificationQueue: () => [...base, "kb", "verificationQueue"] as const,
    versions: (articleId: number) => [...base, "kb", "versions", articleId] as const,
    tags: () => [...base, "kb", "tags"] as const,
    articleTags: (articleId: number) => [...base, "kb", "articleTags", articleId] as const,
    translations: (articleId: number) => [...base, "kb", "translations", articleId] as const,
    translation: (articleId: number, locale: string) => [...base, "kb", "translation", articleId, locale] as const,
    comments: (articleId: number) => [...base, "kb", "comments", articleId] as const,
  },

  roadmap: {
    all: [...base, "roadmap"] as const,
    items: (params?: Record<string, unknown>) => [...base, "roadmap", "items", params] as const,
    item: (id: number) => [...base, "roadmap", "item", id] as const,
    feedback: (params?: Record<string, unknown>) => [...base, "roadmap", "feedback", params] as const,
    changelog: (params?: Record<string, unknown>) => [...base, "roadmap", "changelog", params] as const,
    publicBoard: (orgId: string) => [...base, "roadmap", "publicBoard", orgId] as const,
  },

  automations: {
    all: [...base, "automations"] as const,
    list: (params?: Record<string, unknown>) => [...base, "automations", "list", params] as const,
    detail: (id: number) => [...base, "automations", "detail", id] as const,
    runs: (ruleId: number) => [...base, "automations", "runs", ruleId] as const,
  },

  nps: {
    all: [...base, "nps"] as const,
    surveys: (params?: Record<string, unknown>) => [...base, "nps", "surveys", params] as const,
    survey: (id: number) => [...base, "nps", "survey", id] as const,
    responses: (surveyId: number) => [...base, "nps", "responses", surveyId] as const,
    stats: () => [...base, "nps", "stats"] as const,
    publicSurvey: (token: string) => [...base, "nps", "publicSurvey", token] as const,
  },

  supportMacros: {
    all: [...base, "supportMacros"] as const,
    list: (params?: Record<string, unknown>) => [...base, "supportMacros", "list", params] as const,
  },

  supportRouting: {
    all: [...base, "supportRouting"] as const,
    list: () => [...base, "supportRouting", "list"] as const,
  },

  webhooks: {
    all: [...base, "webhooks"] as const,
    list: () => [...base, "webhooks", "list"] as const,
  },

  workflows: {
    all: [...base, "workflows"] as const,
    list: (params?: Record<string, unknown>) => [...base, "workflows", "list", params] as const,
    detail: (id: string) => [...base, "workflows", id] as const,
    executions: (workflowId: string, params?: Record<string, unknown>) => [...base, "workflows", workflowId, "executions", params] as const,
    execution: (workflowId: string, executionId: string) => [...base, "workflows", workflowId, "executions", executionId] as const,
    approvals: () => [...base, "workflows", "approvals"] as const,
    templates: () => [...base, "workflows", "templates"] as const,
    analytics: () => [...base, "workflows", "analytics"] as const,
    schedules: (workflowId: string) => [...base, "workflows", workflowId, "schedules"] as const,
    secrets: (workflowId: string) => [...base, "workflows", workflowId, "secrets"] as const,
  },

  csat: {
    all: [...base, "csat"] as const,
    surveys: () => [...base, "csat", "surveys"] as const,
    responses: (surveyId: number) => [...base, "csat", "responses", surveyId] as const,
  },

  sla: {
    all: [...base, "sla"] as const,
    compliance: () => [...base, "sla", "compliance"] as const,
  },

  mfa: {
    all: [...base, "mfa"] as const,
    status: () => [...base, "mfa", "status"] as const,
  },

  auth: {
    all: [...base, "auth"] as const,
    sessions: () => [...base, "auth", "sessions"] as const,
    devices: () => [...base, "auth", "devices"] as const,
    loginHistory: (params?: Record<string, unknown>) => [...base, "auth", "loginHistory", params] as const,
  },

  featureFlags: {
    all: [...base, "featureFlags"] as const,
    list: () => [...base, "featureFlags", "list"] as const,
    detail: (key: string) => [...base, "featureFlags", key] as const,
  },

  calendar: {
    all: [...base, "calendar"] as const,
    events: (start: string, end: string) => [...base, "calendar", "events", start, end] as const,
    attendees: (eventId: number) => [...base, "calendar", "attendees", eventId] as const,
    orgMembers: () => [...base, "calendar", "orgMembers"] as const,
    googleMeetStatus: () => [...base, "calendar", "googleMeetStatus"] as const,
    connections: () => [...base, "calendar", "connections"] as const,
  },

  settings: {
    all: [...base, "settings"] as const,
    featureFlags: () => [...base, "settings", "featureFlags"] as const,
    aiUsage: () => [...base, "settings", "aiUsage"] as const,
    customFields: (entityType: string) => [...base, "settings", "customFields", entityType] as const,
  },

  salesAnalytics: {
    all: [...base, "salesAnalytics"] as const,
    velocity: (params: Record<string, unknown>) => [...base, "salesAnalytics", "velocity", params] as const,
    aging: (thresholdDays: number) => [...base, "salesAnalytics", "aging", thresholdDays] as const,
    cycleLength: (repId?: string) => [...base, "salesAnalytics", "cycleLength", repId] as const,
    lostAnalysis: (repId?: string) => [...base, "salesAnalytics", "lostAnalysis", repId] as const,
    cohort: (months: number) => [...base, "salesAnalytics", "cohort", months] as const,
    repComparison: (rep1Id?: number, rep2Id?: number) => [...base, "salesAnalytics", "repComparison", rep1Id, rep2Id] as const,
    sourceReport: () => [...base, "salesAnalytics", "sourceReport"] as const,
  },

  hierarchy: {
    all: [...base, "hierarchy"] as const,
    businessUnits: (params?: Record<string, unknown>) => [...base, "hierarchy", "businessUnits", params] as const,
    orgBranches: (params?: Record<string, unknown>) => [...base, "hierarchy", "orgBranches", params] as const,
    departments: (params?: Record<string, unknown>) => [...base, "hierarchy", "departments", params] as const,
    teams: (params?: Record<string, unknown>) => [...base, "hierarchy", "teams", params] as const,
    locations: (params?: Record<string, unknown>) => [...base, "hierarchy", "locations", params] as const,
    costCenters: (params?: Record<string, unknown>) => [...base, "hierarchy", "costCenters", params] as const,
    tree: () => [...base, "hierarchy", "tree"] as const,
  },

  inventory: {
    all: [...base, "inventory"] as const,
    products: (params?: Record<string, unknown>) => [...base, "inventory", "products", params] as const,
    product: (id: number) => [...base, "inventory", "product", id] as const,
    productVariants: (params?: Record<string, unknown>) => [...base, "inventory", "productVariants", params] as const,
    productStockLevels: (id: number) => [...base, "inventory", "product", id, "stock"] as const,
    categories: () => [...base, "inventory", "categories"] as const,
    uom: () => [...base, "inventory", "uom"] as const,
    warehouses: () => [...base, "inventory", "warehouses"] as const,
    warehouse: (id: number) => [...base, "inventory", "warehouse", id] as const,
    locations: (warehouseId: number) => [...base, "inventory", "locations", warehouseId] as const,
    stockLevels: (params?: Record<string, unknown>) => [...base, "inventory", "stockLevels", params] as const,
    stockTransactions: (params?: Record<string, unknown>) => [...base, "inventory", "stockTransactions", params] as const,
    adjustments: (params?: Record<string, unknown>) => [...base, "inventory", "adjustments", params] as const,
    transfers: (params?: Record<string, unknown>) => [...base, "inventory", "transfers", params] as const,
    transfer: (id: number) => [...base, "inventory", "transfer", id] as const,
    vendors: (params?: Record<string, unknown>) => [...base, "inventory", "vendors", params] as const,
    vendor: (id: number) => [...base, "inventory", "vendor", id] as const,
    purchaseOrders: (params?: Record<string, unknown>) => [...base, "inventory", "purchaseOrders", params] as const,
    purchaseOrder: (id: number) => [...base, "inventory", "purchaseOrder", id] as const,
    grns: (poId: number) => [...base, "inventory", "grns", poId] as const,
    salesOrders: (params?: Record<string, unknown>) => [...base, "inventory", "salesOrders", params] as const,
    salesOrder: (id: number) => [...base, "inventory", "salesOrder", id] as const,
    dashboard: () => [...base, "inventory", "dashboard"] as const,
    stockSummary: (params?: Record<string, unknown>) => [...base, "inventory", "stockSummary", params] as const,
    reorderReport: () => [...base, "inventory", "reorderReport"] as const,
    movementsReport: (params?: Record<string, unknown>) => [...base, "inventory", "movementsReport", params] as const,
  },

  apiTokens: {
    all: [...base, "apiTokens"] as const,
    list: (params?: Record<string, unknown>) => [...base, "apiTokens", "list", params] as const,
  },

  userApiTokens: {
    all: [...base, "userApiTokens"] as const,
    list: () => [...base, "userApiTokens", "list"] as const,
  },

  users: {
    all: [...base, "users"] as const,
    list: (params?: Record<string, unknown>) => [...base, "users", "list", params] as const,
    detail: (id: string) => [...base, "users", "detail", id] as const,
    sessions: (userId: string) => [...base, "users", "sessions", userId] as const,
    devices: (userId: string) => [...base, "users", "devices", userId] as const,
    activity: (userId: string) => [...base, "users", "activity", userId] as const,
    preferences: (userId: string) => [...base, "users", "preferences", userId] as const,
    stats: () => [...base, "users", "stats"] as const,
    invitations: (params?: Record<string, unknown>) => [...base, "users", "invitations", params] as const,
    loginHistory: (userId: string, params?: Record<string, unknown>) => [...base, "users", "loginHistory", userId, params] as const,
    membership: (userId: string) => [...base, "users", "membership", userId] as const,
    orgAuditLog: (params?: Record<string, unknown>) => [...base, "users", "orgAuditLog", params] as const,
  },


  crmProducts: {
    all: [...base, "crmProducts"] as const,
    list: (params?: Record<string, unknown>) => [...base, "crmProducts", "list", params] as const,
    detail: (id: number) => [...base, "crmProducts", "detail", id] as const,
  },

  crmQuotes: {
    all: [...base, "crmQuotes"] as const,
    list: (params?: Record<string, unknown>) => [...base, "crmQuotes", "list", params] as const,
    byDeal: (dealId: number) => [...base, "crmQuotes", "byDeal", dealId] as const,
    detail: (id: number) => [...base, "crmQuotes", "detail", id] as const,
  },

} as const;
