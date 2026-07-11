

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
    candidates: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "hr", "candidates"] as const)
        : ([...base, "hr", "candidates", params] as const),
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
    externalReferrals: () => [...base, "hr", "externalReferrals"] as const,
    externalReferrers: () => [...base, "hr", "externalReferrers"] as const,
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
    hrTemplates: (params?: Record<string, unknown>) => [...base, "hr", "templates", params] as const,
    hrTemplate: (id: number) => [...base, "hr", "template", id] as const,
    hrTemplateRenders: (templateId: number) => [...base, "hr", "template", templateId, "renders"] as const,
    hrTemplateVariables: () => [...base, "hr", "templateVariables"] as const,
    employeeEmployment: (userId: string) => [...base, "hr", "employeeEmployment", userId] as const,
    employeeTimeline: (employmentId: number, params?: Record<string, unknown>) => [...base, "hr", "employeeTimeline", employmentId, params] as const,
    employeeSensitive: (employmentId: number) => [...base, "hr", "employeeSensitive", employmentId] as const,
    effectiveChanges: (params?: Record<string, unknown>) => [...base, "hr", "effectiveChanges", params] as const,
    orgLocations: () => [...base, "hr", "org", "locations"] as const,
    orgRoles: () => [...base, "hr", "org", "roles"] as const,
    orgLevels: () => [...base, "hr", "org", "levels"] as const,
    orgTeams: () => [...base, "hr", "org", "teams"] as const,
    orgHeadcount: (groupBy: string) => [...base, "hr", "org", "headcount", groupBy] as const,
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
    approvals: (params?: Record<string, unknown>) => [...base, "deals", "approvals", params] as const,
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
    simpleList: () => [...base, "clients", "simpleList"] as const,
    timeline: (clientId: number) => [...base, "clients", "timeline", clientId] as const,
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
    qa: {
      suites: (projectId?: number) => [...base, "projects", projectId, "qa", "suites"] as const,
      cases: (projectId?: number, params?: Record<string, unknown>) => [...base, "projects", projectId, "qa", "cases", params] as const,
      case: (projectId?: number, id?: number) => [...base, "projects", projectId, "qa", "cases", id] as const,
      runs: (projectId?: number, status?: string) => [...base, "projects", projectId, "qa", "runs", status] as const,
      run: (projectId?: number, runId?: number) => [...base, "projects", projectId, "qa", "runs", runId] as const,
    },
    bugs: {
      list: (projectId?: number, params?: Record<string, unknown>) => [...base, "projects", projectId, "bugs", params] as const,
      detail: (projectId?: number, bugId?: number) => [...base, "projects", projectId, "bugs", bugId] as const,
    },
    changeRequests: {
      list: (projectId: number, params?: Record<string, unknown>) => [...base, "projects", projectId, "change-requests", params] as const,
      detail: (projectId: number, crId: number) => [...base, "projects", projectId, "change-requests", crId] as const,
    },
    clientPortal: {
      projects: () => [...base, "projects", "portal", "projects"] as const,
      overview: (projectId: number) => [...base, "projects", "portal", projectId, "overview"] as const,
      changeRequests: (projectId: number) => [...base, "projects", "portal", projectId, "change-requests"] as const,
      visibility: (projectId: number) => [...base, "projects", projectId, "client-visibility"] as const,
    },
    approvals: {
      inbox: () => [...base, "projects", "approvals", "inbox"] as const,
      list: (projectId: number, params?: Record<string, unknown>) => [...base, "projects", projectId, "approvals", params] as const,
      detail: (projectId: number, id: number) => [...base, "projects", projectId, "approvals", id] as const,
    },
    risks: {
      list: (projectId: number, params?: Record<string, unknown>) => [...base, "projects", projectId, "risks", params] as const,
      detail: (projectId: number, id: number) => [...base, "projects", projectId, "risks", id] as const,
    },
    decisions: {
      list: (projectId: number, params?: Record<string, unknown>) => [...base, "projects", projectId, "decisions", params] as const,
      detail: (projectId: number, id: number) => [...base, "projects", projectId, "decisions", id] as const,
    },
    meetings: {
      all: (projectId: number) => [...base, "projects", projectId, "meetings"] as const,
      list: (projectId: number, params?: Record<string, unknown>) =>
        params === undefined
          ? ([...base, "projects", projectId, "meetings", "list"] as const)
          : ([...base, "projects", projectId, "meetings", "list", params] as const),
      detail: (projectId: number, id: number) => [...base, "projects", projectId, "meetings", id] as const,
    },
    incidents: {
      list: (projectId?: number, params?: Record<string, unknown>) => [...base, "projects", projectId, "incidents", params] as const,
      detail: (projectId?: number, id?: number) => [...base, "projects", projectId, "incidents", id] as const,
    },
    forms: {
      list: (projectId: number, params?: Record<string, unknown>) => [...base, "projects", projectId, "forms", params] as const,
      detail: (projectId: number, formId: number) => [...base, "projects", projectId, "forms", formId] as const,
      submissions: (projectId: number, formId: number) => [...base, "projects", projectId, "forms", formId, "submissions"] as const,
    },
    portfolios: {
      list: (params?: Record<string, unknown>) => [...base, "projects", "portfolios", "list", params] as const,
      detail: (id: number) => [...base, "projects", "portfolios", "detail", id] as const,
    },
    programs: {
      list: (params?: Record<string, unknown>) => [...base, "projects", "programs", "list", params] as const,
      detail: (id: number) => [...base, "projects", "programs", "detail", id] as const,
    },
    workflow: {
      transitions: (projectId: number) => [...base, "projects", projectId, "workflow", "transitions"] as const,
    },
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
    inviteLink: (channelId: number) => [...base, "chat", "inviteLink", channelId] as const,
    orgSettings: () => [...base, "chat", "orgSettings"] as const,
  },

  aiChat: {
    all: [...base, "aiChat"] as const,
    history: () => [...base, "aiChat", "history"] as const,
    conversations: () => [...base, "aiChat", "conversations"] as const,
    conversationMessages: (conversationId: number) => [...base, "aiChat", "conversations", conversationId, "messages"] as const,
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
    providers: () => [...base, "notifications", "providers"] as const,
    events: () => [...base, "notifications", "events"] as const,
    policy: () => [...base, "notifications", "policy"] as const,
    suppressions: () => [...base, "notifications", "suppressions"] as const,
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

  orgSetup: {
    all: [...base, "org-setup"] as const,
    session: () => [...base, "org-setup", "session"] as const,
  },

  onboardingFlow: {
    all: [...base, "onboarding-flow"] as const,
    session: () => [...base, "onboarding-flow", "session"] as const,
    moduleChecklists: () => [...base, "onboarding-flow", "module-checklists"] as const,
    tours: () => [...base, "onboarding-flow", "tours"] as const,
  },

  payments: {
    all: [...base, "payments"] as const,
    catalog: () => [...base, "payments", "catalog"] as const,
    providers: () => [...base, "payments", "providers"] as const,
    provider: (providerKey: string) => [...base, "payments", "providers", providerKey] as const,
    testTransactions: (providerKey: string) => [...base, "payments", "providers", providerKey, "test-transactions"] as const,
    webhookEvents: (providerKey: string) => [...base, "payments", "providers", providerKey, "webhook-events"] as const,
    readiness: (providerKey: string) => [...base, "payments", "providers", providerKey, "readiness"] as const,
    audit: (providerKey?: string) => [...base, "payments", "audit", providerKey ?? "all"] as const,
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
    hub: () => [...base, "whiteboards", "hub"] as const,
    list: (projectId: number) => [...base, "whiteboards", "list", projectId] as const,
    detail: (id: number) => [...base, "whiteboards", "detail", id] as const,
    publicLink: (token: string) => [...base, "whiteboards", "publicLink", token] as const,
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
    kbPages: () => [...base, "kb", "pages"] as const,
    pagesTree: () => [...base, "kb", "pages", "tree"] as const,
    pagesRecent: () => [...base, "kb", "pages", "recent"] as const,
    pagesFavorites: () => [...base, "kb", "pages", "favorites"] as const,
    pagesTrash: () => [...base, "kb", "pages", "trash"] as const,
    pagesSearch: (q: string) => [...base, "kb", "pages", "search", q] as const,
    page: (pageId: number) => [...base, "kb", "pages", pageId] as const,
    pageBacklinks: (pageId: number) => [...base, "kb", "pages", pageId, "backlinks"] as const,
    pageVersions: (pageId: number) => [...base, "kb", "pages", pageId, "versions"] as const,
    pageVersion: (pageId: number, versionNumber: number) => [...base, "kb", "pages", pageId, "versions", versionNumber] as const,
    pageComments: (pageId: number) => [...base, "kb", "pages", pageId, "comments"] as const,
    pageTemplates: () => [...base, "kb", "page-templates"] as const,
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
    chatHistory: () => [...base, "kb", "chatHistory"] as const,
    chatConversations: () => [...base, "kb", "chatConversations"] as const,
    chatConversationMessages: (conversationId: number) => [...base, "kb", "chatConversations", conversationId, "messages"] as const,
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
    pageReviews: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "kb", "pageReviews"] as const)
        : ([...base, "kb", "pageReviews", params] as const),
    pageReviewsDue: () => [...base, "kb", "pageReviewsDue"] as const,
    pageRecordLinks: (pageId: number) => [...base, "kb", "pages", pageId, "record-links"] as const,
    recordLinksByRecord: (targetType: string, targetId: string) => [...base, "kb", "record-links", "by-record", targetType, targetId] as const,
    importJobs: () => [...base, "kb", "import-jobs"] as const,
    exportJobs: () => [...base, "kb", "export-jobs"] as const,
    articleMigrationPreview: () => [...base, "kb", "article-migration", "preview"] as const,
    pageAnalytics: () => [...base, "kb", "pageAnalytics"] as const,
    knowledgeGaps: (range?: Record<string, unknown>) =>
      range === undefined
        ? ([...base, "kb", "knowledgeGaps"] as const)
        : ([...base, "kb", "knowledgeGaps", range] as const),
    settings: () => [...base, "kb", "settings"] as const,
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
    publicSurvey: (token: string) => [...base, "nps", "publicSurvey", token] as const,
  },

  surveys: {
    all: [...base, "surveys"] as const,
    list: (params?: Record<string, unknown>) => [...base, "surveys", "list", params] as const,
    detail: (id: number) => [...base, "surveys", "detail", id] as const,
    templates: () => [...base, "surveys", "templates"] as const,
    builder: (id: number) => [...base, "surveys", "builder", id] as const,
    logic: (id: number) => [...base, "surveys", "logic", id] as const,
    collectors: (id: number) => [...base, "surveys", "collectors", id] as const,
    participants: (id: number, params?: Record<string, unknown>) => [...base, "surveys", "participants", id, params] as const,
    publicSurvey: (token: string) => [...base, "surveys", "publicSurvey", token] as const,
    assessmentAttempts: (id: number, params?: Record<string, unknown>) => [...base, "surveys", "assessmentAttempts", id, params] as const,
    certificates: (id: number) => [...base, "surveys", "certificates", id] as const,
    liveSession: (sessionId: number) => [...base, "surveys", "liveSession", sessionId] as const,
    publicLiveSession: (sessionCode: string) => [...base, "surveys", "publicLiveSession", sessionCode] as const,
    analyticsOverview: (id: number) => [...base, "surveys", "analyticsOverview", id] as const,
    analyticsQuestions: (id: number) => [...base, "surveys", "analyticsQuestions", id] as const,
    responses: (id: number, params?: Record<string, unknown>) => [...base, "surveys", "responses", id, params] as const,
    response: (id: number, sessionId: number) => [...base, "surveys", "response", id, sessionId] as const,
    automations: (id: number) => [...base, "surveys", "automations", id] as const,
  },

  supportMacros: {
    all: [...base, "supportMacros"] as const,
    list: (params?: Record<string, unknown>) => [...base, "supportMacros", "list", params] as const,
    usage: () => [...base, "supportMacros", "usage"] as const,
  },

  supportSlaPolicies: {
    all: [...base, "supportSlaPolicies"] as const,
    list: () => [...base, "supportSlaPolicies", "list"] as const,
  },

  supportCustomFields: {
    all: [...base, "supportCustomFields"] as const,
    list: (activeOnly?: boolean) => [...base, "supportCustomFields", "list", activeOnly ?? null] as const,
    ticketValues: (ticketId: number) => [...base, "supportCustomFields", "ticketValues", ticketId] as const,
    portalActive: () => [...base, "supportCustomFields", "portalActive"] as const,
  },

  supportSettingsAuditLog: {
    all: [...base, "supportSettingsAuditLog"] as const,
    list: (entityType?: string) => [...base, "supportSettingsAuditLog", "list", entityType ?? null] as const,
  },

  supportBusinessHours: {
    all: [...base, "supportBusinessHours"] as const,
    list: () => [...base, "supportBusinessHours", "list"] as const,
  },

  supportTicketRisk: {
    all: [...base, "supportTicketRisk"] as const,
    detail: (ticketId: number) => [...base, "supportTicketRisk", "detail", ticketId] as const,
  },

  supportChannels: {
    all: [...base, "supportChannels"] as const,
    list: () => [...base, "supportChannels", "list"] as const,
  },

  supportChatWidget: {
    all: [...base, "supportChatWidget"] as const,
    session: (orgId: string, token: string) => [...base, "supportChatWidget", "session", orgId, token] as const,
  },

  supportPortalTickets: {
    all: [...base, "supportPortalTickets"] as const,
    list: (params?: Record<string, unknown>) => [...base, "supportPortalTickets", "list", params] as const,
    detail: (id: number) => [...base, "supportPortalTickets", "detail", id] as const,
  },

  supportCsat: {
    all: [...base, "supportCsat"] as const,
    report: () => [...base, "supportCsat", "report"] as const,
    survey: (token: string) => [...base, "supportCsat", "survey", token] as const,
  },

  supportAiSuggestions: {
    all: [...base, "supportAiSuggestions"] as const,
    list: (ticketId: number) => [...base, "supportAiSuggestions", "list", ticketId] as const,
  },

  supportReports: {
    all: [...base, "supportReports"] as const,
    overview: (params?: Record<string, unknown>) => [...base, "supportReports", "overview", params] as const,
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
    list: (ticketId: number) => [...base, "supportWatchers", "list", ticketId] as const,
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
    memberSearch: (search: string) => [...base, "calendar", "memberSearch", search] as const,
    externalEvents: (start: string, end: string) => [...base, "calendar", "externalEvents", start, end] as const,
  },

  integrations: {
    all: [...base, "integrations"] as const,
    connections: () => [...base, "integrations", "connections"] as const,
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
    categories: () => [...base, "inventory", "categories"] as const,
    uom: () => [...base, "inventory", "uom"] as const,
    warehouses: () => [...base, "inventory", "warehouses"] as const,
    warehouse: (id: number) => [...base, "inventory", "warehouse", id] as const,
    locations: (warehouseId: number) => [...base, "inventory", "locations", warehouseId] as const,
    availability: (variantId: number, warehouseId?: number) => [...base, "inventory", "availability", variantId, warehouseId] as const,
    reservations: (params?: Record<string, unknown>) => [...base, "inventory", "reservations", params] as const,
    stockLevels: (params?: Record<string, unknown>) => [...base, "inventory", "stockLevels", params] as const,
    stockTransactions: (params?: Record<string, unknown>) => [...base, "inventory", "stockTransactions", params] as const,
    adjustments: (params?: Record<string, unknown>) => [...base, "inventory", "adjustments", params] as const,
    transfers: (params?: Record<string, unknown>) => [...base, "inventory", "transfers", params] as const,
    transfer: (id: number) => [...base, "inventory", "transfer", id] as const,
    vendors: (params?: Record<string, unknown>) => [...base, "inventory", "vendors", params] as const,
    vendor: (id: number) => [...base, "inventory", "vendor", id] as const,
    purchaseOrders: (params?: Record<string, unknown>) => [...base, "inventory", "purchaseOrders", params] as const,
    purchaseOrder: (id: number) => [...base, "inventory", "purchaseOrder", id] as const,
    salesOrders: (params?: Record<string, unknown>) => [...base, "inventory", "salesOrders", params] as const,
    salesOrder: (id: number) => [...base, "inventory", "salesOrder", id] as const,
    dashboard: () => [...base, "inventory", "dashboard"] as const,
    stockSummary: (params?: Record<string, unknown>) => [...base, "inventory", "stockSummary", params] as const,
    reorderReport: () => [...base, "inventory", "reorderReport"] as const,
    movementsReport: (params?: Record<string, unknown>) => [...base, "inventory", "movementsReport", params] as const,
    lots: (params?: Record<string, unknown>) => [...base, "inventory", "lots", params] as const,
    lot: (id: number) => [...base, "inventory", "lot", id] as const,
    serials: (params?: Record<string, unknown>) => [...base, "inventory", "serials", params] as const,
    serial: (id: number) => [...base, "inventory", "serial", id] as const,
    expiry: (params?: Record<string, unknown>) => [...base, "inventory", "expiry", params] as const,
    traceability: (params?: Record<string, unknown>) => [...base, "inventory", "traceability", params] as const,
    vendorReturns: (params?: Record<string, unknown>) => [...base, "inventory", "vendorReturns", params] as const,
    vendorReturn: (id: number) => [...base, "inventory", "vendorReturn", id] as const,
    customerReturns: (params?: Record<string, unknown>) => [...base, "inventory", "customerReturns", params] as const,
    customerReturn: (id: number) => [...base, "inventory", "customerReturn", id] as const,
    cycleCounts: (params?: Record<string, unknown>) => [...base, "inventory", "cycleCounts", params] as const,
    cycleCount: (id: number) => [...base, "inventory", "cycleCount", id] as const,
    physicalAudits: (params?: Record<string, unknown>) => [...base, "inventory", "physicalAudits", params] as const,
    physicalAudit: (id: number) => [...base, "inventory", "physicalAudit", id] as const,
    goodsReceipts: (params?: Record<string, unknown>) => [...base, "inventory", "goodsReceipts", params] as const,
    goodsReceipt: (id: number) => [...base, "inventory", "goodsReceipt", id] as const,
    replenishmentRules: (params?: Record<string, unknown>) => [...base, "inventory", "replenishmentRules", params] as const,
    forecasting: (params?: Record<string, unknown>) => [...base, "inventory", "forecasting", params] as const,
    valuationReport: (params?: Record<string, unknown>) => [...base, "inventory", "valuationReport", params] as const,
    qualityInspections: (params?: Record<string, unknown>) => [...base, "inventory", "qualityInspections", params] as const,
    qualityInspection: (id: number) => [...base, "inventory", "qualityInspection", id] as const,
    qualityHolds: (params?: Record<string, unknown>) => [...base, "inventory", "qualityHolds", params] as const,
    recalls: (params?: Record<string, unknown>) => [...base, "inventory", "recalls", params] as const,
    recall: (id: number) => [...base, "inventory", "recall", id] as const,
    packages: (params?: Record<string, unknown>) => [...base, "inventory", "packages", params] as const,
    packageDetail: (id: number) => [...base, "inventory", "packageDetail", id] as const,
    shipments: (params?: Record<string, unknown>) => [...base, "inventory", "shipments", params] as const,
    shipment: (id: number) => [...base, "inventory", "shipment", id] as const,
    loads: (params?: Record<string, unknown>) => [...base, "inventory", "loads", params] as const,
    load: (id: number) => [...base, "inventory", "load", id] as const,
    carriers: () => [...base, "inventory", "carriers"] as const,
    channels: () => [...base, "inventory", "channels"] as const,
    channel: (id: number) => [...base, "inventory", "channel", id] as const,
    channelPublications: (channelId: number) => [...base, "inventory", "channelPublications", channelId] as const,
    threePlConnections: () => [...base, "inventory", "threePlConnections"] as const,
    importJobs: (params?: Record<string, unknown>) => [...base, "inventory", "importJobs", params] as const,
    importJob: (id: number) => [...base, "inventory", "importJob", id] as const,
    settings: () => [...base, "inventory", "settings"] as const,
    numberSequences: () => [...base, "inventory", "numberSequences"] as const,
    aiInsights: (params?: Record<string, unknown>) => [...base, "inventory", "aiInsights", params] as const,
    barcodeLookup: (code: string) => [...base, "inventory", "barcodeLookup", code] as const,
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

  timesheets: {
    all: [...base, "timesheets"] as const,
    payroll: {
      summary: (params: Record<string, unknown>) => [...base, "timesheets", "payroll", "summary", params] as const,
      exports: (page: number, pageSize: number) => [...base, "timesheets", "payroll", "exports", page, pageSize] as const,
      exportRows: (exportId: number) => [...base, "timesheets", "payroll", "exports", exportId, "rows"] as const,
      settings: () => [...base, "timesheets", "payroll", "settings"] as const,
    },
    entries: (params?: Record<string, unknown>) => [...base, "timesheets", "entries", params] as const,
    timerActive: () => [...base, "timesheets", "timer", "active"] as const,
    periods: (params?: Record<string, unknown>) => [...base, "timesheets", "periods", "list", params] as const,
    periodCurrent: () => [...base, "timesheets", "periods", "current"] as const,
    period: (periodId: number) => [...base, "timesheets", "periods", "detail", periodId] as const,
    approvals: (params?: Record<string, unknown>) => [...base, "timesheets", "approvals", params] as const,
    billingUninvoiced: (params?: Record<string, unknown>) => [...base, "timesheets", "billing", "uninvoiced", params] as const,
    ratePreview: (params: Record<string, unknown>) => [...base, "timesheets", "billing", "rate-preview", params] as const,
    reportsOverview: (params?: Record<string, unknown>) => [...base, "timesheets", "reports", "overview", params] as const,
    settings: () => [...base, "timesheets", "settings"] as const,
    rates: () => [...base, "timesheets", "rates"] as const,
    budgets: () => [...base, "timesheets", "budgets"] as const,
    audit: (params?: Record<string, unknown>) => [...base, "timesheets", "audit", params] as const,
  },

  payroll: {
    all: [...base, "payroll"] as const,
    templates: (params?: Record<string, unknown>) => [...base, "payroll", "templates", params] as const,
    template: (id: number) => [...base, "payroll", "template", id] as const,
    templatePreview: (id: number, ctc: string) => [...base, "payroll", "template", id, "preview", ctc] as const,
    policy: () => [...base, "payroll", "policy"] as const,
    policyVersions: (policyId: number) => [...base, "payroll", "policy", policyId, "versions"] as const,
    toggleImpact: (toggle: string) => [...base, "payroll", "toggle-impact", toggle] as const,
    policyPreview: (params?: Record<string, unknown>) => [...base, "payroll", "policy", "preview", params] as const,
    components: (params?: Record<string, unknown>) => [...base, "payroll", "components", params] as const,
    runApprovals: (runId: number) => [...base, "payroll", "runs", runId, "approvals"] as const,
    bankValidation: (runId: number) => [...base, "payroll", "runs", runId, "payout", "validation"] as const,
    bankBatches: (runId?: number) => [...base, "payroll", "payout", "batches", runId] as const,
    bankBatch: (batchId: number) => [...base, "payroll", "payout", "batches", batchId] as const,
    employeeBank: (employeeUserId: string) => [...base, "payroll", "employees", employeeUserId, "bank"] as const,
    payslipTemplates: () => [...base, "payroll", "payslip-templates"] as const,
    runPublications: (runId: number) => [...base, "payroll", "runs", runId, "payslips"] as const,
    runs: (params?: Record<string, unknown>) => [...base, "payroll", "runs", params] as const,
    run: (runId: number) => [...base, "payroll", "runs", runId] as const,
    reports: (kind: string, params?: Record<string, unknown>) => [...base, "payroll", "reports", kind, params] as const,
    journal: (month: string) => [...base, "payroll", "journal", month] as const,
    accountingMappings: () => [...base, "payroll", "accounting-mappings"] as const,
    calendar: (params?: Record<string, unknown>) => [...base, "payroll", "calendar", params] as const,
    taxWindows: () => [...base, "payroll", "tax-windows"] as const,
    taxDeclarations: (params?: Record<string, unknown>) => [...base, "payroll", "tax-declarations", params] as const,
    fnf: (params?: Record<string, unknown>) => [...base, "payroll", "fnf", params] as const,
    loanAdjustments: () => [...base, "payroll", "loan-adjustments"] as const,
    commandCenterAll: [...base, "payroll", "command-center"] as const,
    commandCenter: (month: string) => [...base, "payroll", "command-center", month] as const,
    employees: (params?: Record<string, unknown>) => [...base, "payroll", "employees", "list", params] as const,
    employee: (employeeUserId: string) => [...base, "payroll", "employees", employeeUserId] as const,
    employeeHistory: (employeeUserId: string) => [...base, "payroll", "employees", employeeUserId, "history"] as const,
    runEmployeesAll: (runId: number) => [...base, "payroll", "run-employees", runId] as const,
    runEmployeesList: (runId: number, params?: Record<string, unknown>) => [...base, "payroll", "run-employees", runId, "list", params] as const,
    runEmployee: (runId: number, runEmployeeId: number) => [...base, "payroll", "run-employees", runId, runEmployeeId] as const,
    runVariance: (runId: number) => [...base, "payroll", "run-variance", runId] as const,
    runExceptionsAll: (runId: number) => [...base, "payroll", "run-exceptions", runId] as const,
    runExceptions: (runId: number, params?: Record<string, unknown>) => [...base, "payroll", "run-exceptions", runId, "list", params] as const,
    runInputsAll: (runId: number) => [...base, "payroll", "run-inputs", runId] as const,
    runInputs: (runId: number, params?: Record<string, unknown>) => [...base, "payroll", "run-inputs", runId, "list", params] as const,
  },

  feedbucket: {
    all: [...base, "feedbucket"] as const,
    widgets: () => [...base, "feedbucket", "widgets"] as const,
    widget: (id: number) => [...base, "feedbucket", "widgets", id] as const,
    submissions: (params?: Record<string, unknown>) => [...base, "feedbucket", "submissions", params] as const,
    submission: (id: number) => [...base, "feedbucket", "submissions", id] as const,
    stats: () => [...base, "feedbucket", "stats"] as const,
  },

} as const;
