const base = ["streamlineos"] as const;

export const queryKeys = {
  hr: {
    all: [...base, "hr"] as const,
    departments: () => [...base, "hr", "departments"] as const,
    legacyDepartments: () => [...base, "hr", "departments", "legacy"] as const,
    employees: (params?: Record<string, unknown>) =>
      [...base, "hr", "employees", params] as const,
    employee: (id: string) => [...base, "hr", "employees", id] as const,
    attendanceStatus: (orgId: string | null | undefined = "") =>
      [...base, "hr", orgId, "attendanceStatus"] as const,
    attendanceLogs: (params?: Record<string, unknown>) =>
      [...base, "hr", "attendanceLogs", params] as const,
    leaves: (params?: Record<string, unknown>) =>
      [...base, "hr", "leaves", params] as const,
    leaveBalance: (userId?: string) =>
      [...base, "hr", "leaveBalance", userId] as const,
    salaryStructures: (userId?: string) =>
      [...base, "hr", "salaryStructures", userId] as const,
    expenses: (params?: Record<string, unknown>) =>
      [...base, "hr", "expenses", params] as const,
    assets: (params?: Record<string, unknown>) =>
      [...base, "hr", "assets", params] as const,
    documents: (params?: Record<string, unknown>) =>
      [...base, "hr", "documents", params] as const,
    performanceReviews: (userId?: string) =>
      [...base, "hr", "performanceReviews", userId] as const,
    goals: (userId?: string) => [...base, "hr", "goals", userId] as const,
    workLogs: (params?: Record<string, unknown>) =>
      [...base, "hr", "workLogs", params] as const,
    orgChart: () => [...base, "hr", "orgChart"] as const,
    wfhRequests: () => [...base, "hr", "wfhRequests"] as const,
    pendingWfhRequests: () => [...base, "hr", "pendingWfhRequests"] as const,
    holidaysYear: (year: number) =>
      [...base, "hr", "holidaysYear", year] as const,
    holidaysCalendar: (params: { year: number; month: number }) =>
      [...base, "hr", "holidaysCalendar", params] as const,
    monthlyAttendance: (params: {
      userId?: string;
      year: number;
      month: number;
    }) => [...base, "hr", "monthlyAttendance", params] as const,
    attendanceHeatmap: (params: { year: number }) =>
      [...base, "hr", "attendanceHeatmap", params] as const,
    employeeStats: (userId: string) =>
      [...base, "hr", "employeeStats", userId] as const,
    employeePayslips: (userId?: string) =>
      [...base, "hr", "employeePayslips", userId] as const,

    recruitmentStats: () => [...base, "hr", "recruitmentStats"] as const,
    jobPostings: (params?: Record<string, unknown>) =>
      [...base, "hr", "jobPostings", params] as const,
    jobPosting: (id: number) => [...base, "hr", "jobPosting", id] as const,
    candidates: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "hr", "candidates"] as const)
        : ([...base, "hr", "candidates", params] as const),
    candidate: (id: number) => [...base, "hr", "candidate", id] as const,
    interviews: (params?: Record<string, unknown>) =>
      [...base, "hr", "interviews", params] as const,
    recruitmentPipeline: () => [...base, "hr", "recruitmentPipeline"] as const,
    scorecardTemplates: () => [...base, "hr", "scorecardTemplates"] as const,
    interviewScorecard: (interviewId: number) =>
      [...base, "hr", "interviewScorecard", interviewId] as const,
    interviewerPerformance: (days: number) =>
      [...base, "hr", "interviewerPerformance", days] as const,
    interviewScorecardSummary: (interviewId: number) =>
      [...base, "hr", "interviewScorecardSummary", interviewId] as const,
    candidateVault: (candidateId: number) =>
      [...base, "hr", "candidateVault", candidateId] as const,
    reviewCycles: () => [...base, "hr", "reviewCycles"] as const,
    reviewCycle: (id: number) => [...base, "hr", "reviewCycle", id] as const,
    oneOnOnes: (params?: Record<string, unknown>) =>
      [...base, "hr", "oneOnOnes", params] as const,
    terminations: () => [...base, "hr", "terminations"] as const,
    termination: (id: number) => [...base, "hr", "termination", id] as const,
    documentTypes: () => [...base, "hr", "documentTypes"] as const,
    onboardingDocsAll: [...base, "hr", "onboardingDocs"] as const,
    onboardingDocs: (params?: Record<string, unknown>) =>
      [...base, "hr", "onboardingDocs", params] as const,
    onboardingDocsSummary: (params?: Record<string, unknown>) =>
      [...base, "hr", "onboardingDocs", "summary", params] as const,
    documentsStats: () => [...base, "hr", "documentsStats"] as const,
    myOnboardingDocs: () => [...base, "hr", "myOnboardingDocs"] as const,
    teams: (teamId?: string) => [...base, "hr", "teams", teamId] as const,
    diversityReport: () => [...base, "hr", "diversityReport"] as const,
    bookingLinks: () => [...base, "hr", "bookingLinks"] as const,
    documentTemplates: (params?: Record<string, unknown>) =>
      [...base, "hr", "documentTemplates", params] as const,
    documentTemplate: (id: number) =>
      [...base, "hr", "documentTemplate", id] as const,
    candidateDocuments: (candidateId: number) =>
      [...base, "hr", "candidateDocuments", candidateId] as const,
    rolloutDocuments: (candidateId: number) =>
      [...base, "hr", "rolloutDocuments", candidateId] as const,
    leavesMyOwn: () => [...base, "hr", "leaves", "my"] as const,
    leavesTeam: () => [...base, "hr", "leaves", "team"] as const,
    leavesThisWeek: () => [...base, "hr", "leavesThisWeek"] as const,
    leavesMyRequests: () => [...base, "hr", "leavesMyRequests"] as const,
    dashboardMetrics: () => [...base, "hr", "dashboard", "metrics"] as const,
    headcountTrends: () =>
      [...base, "hr", "dashboard", "headcountTrends"] as const,
    leaveCalendar: (month: number, year: number) =>
      [...base, "hr", "leaveCalendar", month, year] as const,
    headcount: (groupBy: string) =>
      [...base, "hr", "headcount", groupBy] as const,
    dashboardOnboardingStatus: () =>
      [...base, "hr", "dashboard", "onboardingStatus"] as const,
    dashboardDiversity: () =>
      [...base, "hr", "dashboard", "diversity"] as const,
    dashboardTimeToFill: () =>
      [...base, "hr", "dashboard", "timeToFill"] as const,
    dashboardPayrollSummary: () =>
      [...base, "hr", "dashboard", "payrollSummary"] as const,
    dashboardSalaryBands: () =>
      [...base, "hr", "dashboard", "salaryBands"] as const,
    directory: () => [...base, "hr", "directory"] as const,
    onboardingAll: [...base, "hr", "onboarding"] as const,
    onboardingStatus: () => [...base, "hr", "onboarding", "status"] as const,
    onboardingUser: (userId: string) =>
      [...base, "hr", "onboarding", "user", userId] as const,
    onboardingTemplates: () =>
      [...base, "hr", "onboarding", "templates"] as const,
    onboardingTemplateDepartments: () =>
      [...base, "hr", "onboarding", "templates", "departments"] as const,
    candidateSla: (candidateId: number) =>
      [...base, "hr", "candidateSla", candidateId] as const,
    atsKanban: () => [...base, "hr", "atsKanban"] as const,
    interviewSlas: () => [...base, "hr", "interviewSlas"] as const,
    slaReport: () => [...base, "hr", "slaReport"] as const,
    hiringFlows: () => [...base, "hr", "hiringFlows"] as const,
    hiringFlow: (id: number) => [...base, "hr", "hiringFlow", id] as const,
    hiringFlowRounds: (flowId: number) =>
      [...base, "hr", "hiringFlowRounds", flowId] as const,
    emailSequences: () => [...base, "hr", "emailSequences"] as const,
    emailSequence: (id: number) =>
      [...base, "hr", "emailSequence", id] as const,
    pipelineAutomations: () => [...base, "hr", "pipelineAutomations"] as const,
    referrals: () => [...base, "hr", "referrals"] as const,
    offerTemplates: () => [...base, "hr", "offerTemplates"] as const,
    scorecardAnalytics: (params?: Record<string, unknown>) =>
      [...base, "hr", "scorecardAnalytics", params] as const,
    headcountRequests: (params?: Record<string, unknown>) =>
      [...base, "hr", "headcountRequests", params] as const,
    recruitmentVendors: () => [...base, "hr", "recruitmentVendors"] as const,
    vendorSubmissions: (vendorId: number) =>
      [...base, "hr", "vendorSubmissions", vendorId] as const,
    externalReferrals: () => [...base, "hr", "externalReferrals"] as const,
    externalReferrers: () => [...base, "hr", "externalReferrers"] as const,
    candidateMessages: (candidateId?: number) =>
      [...base, "hr", "candidateMessages", candidateId] as const,
    messageThreads: () => [...base, "hr", "messageThreads"] as const,
    recruiters: () => [...base, "hr", "recruiters"] as const,
    jobRecruiters: (jobId: number) =>
      [...base, "hr", "jobRecruiters", jobId] as const,
    recruiterActivity: (params?: Record<string, unknown>) =>
      [...base, "hr", "recruiterActivity", params] as const,
    scheduledReports: () => [...base, "hr", "scheduledReports"] as const,
    kpis: (params?: Record<string, unknown>) =>
      [...base, "hr", "kpis", params] as const,
    competencyFrameworks: () =>
      [...base, "hr", "competencyFrameworks"] as const,
    feedbackCycles: () => [...base, "hr", "feedbackCycles"] as const,
    feedbackCycle: (id: number) =>
      [...base, "hr", "feedbackCycle", id] as const,
    myPendingReviews: () => [...base, "hr", "myPendingReviews"] as const,
    feedbackResults: (subjectId: string) =>
      [...base, "hr", "feedbackResults", subjectId] as const,
    hrTemplates: (params?: Record<string, unknown>) =>
      [...base, "hr", "templates", params] as const,
    hrTemplate: (id: number) => [...base, "hr", "template", id] as const,
    hrTemplateRenders: (templateId: number) =>
      [...base, "hr", "template", templateId, "renders"] as const,
    hrTemplateVariables: () => [...base, "hr", "templateVariables"] as const,
    employeeEmployment: (userId: string) =>
      [...base, "hr", "employeeEmployment", userId] as const,
    employeeTimeline: (
      employmentId: number,
      params?: Record<string, unknown>,
    ) => [...base, "hr", "employeeTimeline", employmentId, params] as const,
    employeeSensitive: (employmentId: number) =>
      [...base, "hr", "employeeSensitive", employmentId] as const,
    effectiveChanges: (params?: Record<string, unknown>) =>
      [...base, "hr", "effectiveChanges", params] as const,
    orgLocations: () => [...base, "hr", "org", "locations"] as const,
    orgRoles: () => [...base, "hr", "org", "roles"] as const,
    orgLevels: () => [...base, "hr", "org", "levels"] as const,
    orgTeams: () => [...base, "hr", "org", "teams"] as const,
    orgHeadcount: (groupBy: string) =>
      [...base, "hr", "org", "headcount", groupBy] as const,
    probationList: () => [...base, "hr", "probation", "list"] as const,
    exitChecklist: (resignationId: number) =>
      [...base, "hr", "exit", "checklist", resignationId] as const,
    workAuthorizations: (params?: Record<string, unknown>) =>
      [...base, "hr", "global", "workAuthorizations", params] as const,
    workAuthorization: (id: number) =>
      [...base, "hr", "global", "workAuthorization", id] as const,
    complianceRequirements: (params?: Record<string, unknown>) =>
      [...base, "hr", "global", "complianceRequirements", params] as const,
    complianceRequirement: (id: number) =>
      [...base, "hr", "global", "complianceRequirement", id] as const,
    complianceEvents: (params?: Record<string, unknown>) =>
      [...base, "hr", "global", "complianceEvents", params] as const,
    contracts: (params?: Record<string, unknown>) =>
      [...base, "hr", "global", "contracts", params] as const,
    contract: (id: number) =>
      [...base, "hr", "global", "contract", id] as const,
    announcements: () => [...base, "hr", "announcements"] as const,
    announcementsAll: () => [...base, "hr", "announcements", "all"] as const,
    compOff: () => [...base, "hr", "comp-off"] as const,
    complianceCalendar: (year: number, month: number) =>
      [...base, "hr", "compliance", "calendar", year, month] as const,
    travelAll: [...base, "hr", "travel"] as const,
    travelMine: () => [...base, "hr", "travel", "mine"] as const,
    travelApprovals: () => [...base, "hr", "travel", "approvals"] as const,
    leavePolicies: () => [...base, "hr", "leave-policies"] as const,
    leavePolicy: () => [...base, "hr", "leave-policy"] as const,
    requisitions: (status?: string) =>
      [...base, "hr", "requisitions", status] as const,
    salaryStructureTemplates: () =>
      [...base, "hr", "salary-structure-templates"] as const,
    settingsHubRules: (params: Record<string, unknown> | null) =>
      [...base, "hr", "settings-hub", "effective-rules", params] as const,
    settingsHubVersionsAll: [...base, "hr", "settings-hub", "versions"] as const,
    settingsHubVersions: (entity: string, id: number | null) =>
      [...base, "hr", "settings-hub", "versions", entity, id] as const,
    holidays: () => [...base, "hr", "holidays"] as const,
    importJobs: (entity?: string) =>
      [...base, "hr", "import", "jobs", entity ?? "all"] as const,
    importJob: (jobId: string) =>
      [...base, "hr", "import", "jobs", jobId] as const,
    hrCalendar: (from: string, to: string, types?: string) =>
      [...base, "hr", "calendar", from, to, types] as const,
    benefitsAll: [...base, "hr", "benefits"] as const,
    benefitPlans: (params?: Record<string, unknown>) =>
      [...base, "hr", "benefits", "plans", params] as const,
    benefitPlan: (id: number) => [...base, "hr", "benefits", "plans", id] as const,
    benefitWindows: [...base, "hr", "benefits", "windows"] as const,
    benefitMy: [...base, "hr", "benefits", "my"] as const,
    benefitDependents: [...base, "hr", "benefits", "dependents"] as const,
    benefitClaims: (params?: Record<string, unknown>) =>
      [...base, "hr", "benefits", "claims", params] as const,
    benefitAvailable: () =>
      [...base, "hr", "benefits", "plans", "available"] as const,
    travelVisitLogs: (travelRequestId: number) =>
      [...base, "hr", "travel-visits", travelRequestId] as const,
    internshipCertificate: (contractId: number) =>
      [...base, "hr", "global", "contracts", contractId, "certificate"] as const,
    hrPoliciesAll: [...base, "hr", "policies"] as const,
    hrPoliciesList: (params?: Record<string, unknown>) =>
      [...base, "hr", "policies", "list", params] as const,
    hrPolicyDetail: (id: number) =>
      [...base, "hr", "policies", "detail", id] as const,
  },

  leads: {
    all: [...base, "leads"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "leads", "list", params] as const,
    board: () => [...base, "leads", "board"] as const,
    detail: (id: number) => [...base, "leads", "detail", id] as const,
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
    detail: (id: number) => [...base, "deals", "detail", id] as const,
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
    stakeholders: (dealId: number) =>
      [...base, "deals", "stakeholders", dealId] as const,
  },

  contacts: {
    all: [...base, "contacts"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "contacts", "list", params] as const,
    detail: (id: number) => [...base, "contacts", "detail", id] as const,
    search: (q: string) => [...base, "contacts", "search", q] as const,
  },

  clients: {
    all: [...base, "clients"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "clients", "list", params] as const,
    detail: (id: number) => [...base, "clients", "detail", id] as const,
    activities: (id: number) => [...base, "clients", "activities", id] as const,
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

  projects: {
    all: [...base, "projects"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...base, "projects", "list", filters] as const,
    detail: (id: number) => [...base, "projects", "detail", id] as const,
    sprints: (projectId?: number) =>
      projectId === undefined
        ? ([...base, "projects", "sprints"] as const)
        : ([...base, "projects", "sprints", projectId] as const),
    sprint: (id: number) =>
      [...base, "projects", "sprints", "detail", id] as const,
    tickets: (params?: Record<string, unknown>) =>
      [...base, "projects", "tickets", params] as const,
    ticket: (id: number) =>
      [...base, "projects", "tickets", "detail", id] as const,
    ticketRelations: (ticketId: number) =>
      [...base, "projects", "tickets", "detail", ticketId, "relations"] as const,
    subtasks: (ticketId: number) =>
      [...base, "projects", "subtasks", { ticketId }] as const,
    ticketSearch: (q: string) =>
      [...base, "projects", "search", "tickets", q] as const,
    members: (projectId?: number) =>
      projectId === undefined
        ? ([...base, "projects", "members"] as const)
        : ([...base, "projects", "members", projectId] as const),
    labels: (projectId?: number) =>
      projectId === undefined
        ? ([...base, "projects", "labels"] as const)
        : ([...base, "projects", "labels", projectId] as const),
    timeEntries: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "projects", "timeEntries"] as const)
        : ([...base, "projects", "timeEntries", params] as const),
    epics: (projectId: number) =>
      [...base, "projects", "epics", projectId] as const,
    cycles: (projectId: number) =>
      [...base, "projects", "cycles", projectId] as const,
    modules: (projectId: number) =>
      [...base, "projects", "modules", projectId] as const,
    views: (projectId: number) =>
      [...base, "projects", "views", projectId] as const,
    intake: (projectId: number) =>
      [...base, "projects", "intake", projectId] as const,
    analytics: (projectId: number) =>
      [...base, "projects", "analytics", projectId] as const,
    watchers: (ticketId: number) =>
      [...base, "projects", "watchers", ticketId] as const,
    budget: (projectId: number) =>
      [...base, "projects", "budget", projectId] as const,
    templates: () => [...base, "projects", "templates"] as const,
    qa: {
      suites: (projectId?: number) =>
        [...base, "projects", projectId, "qa", "suites"] as const,
      casesAll: (projectId?: number) =>
        [...base, "projects", projectId, "qa", "cases"] as const,
      cases: (projectId?: number, params?: Record<string, unknown>) =>
        [...base, "projects", projectId, "qa", "cases", params] as const,
      case: (projectId?: number, id?: number) =>
        [...base, "projects", projectId, "qa", "cases", id] as const,
      runs: (projectId?: number, status?: string) =>
        status === undefined
          ? ([...base, "projects", projectId, "qa", "runs"] as const)
          : ([...base, "projects", projectId, "qa", "runs", status] as const),
      run: (projectId?: number, runId?: number) =>
        [...base, "projects", projectId, "qa", "runs", runId] as const,
    },
    bugs: {
      list: (projectId?: number, params?: Record<string, unknown>) =>
        params === undefined
          ? ([...base, "projects", projectId, "bugs"] as const)
          : ([...base, "projects", projectId, "bugs", params] as const),
      detail: (projectId?: number, bugId?: number) =>
        [...base, "projects", projectId, "bugs", bugId] as const,
    },
    changeRequests: {
      list: (projectId: number, params?: Record<string, unknown>) =>
        params === undefined
          ? ([...base, "projects", projectId, "change-requests"] as const)
          : ([...base, "projects", projectId, "change-requests", params] as const),
      detail: (projectId: number, crId: number) =>
        [...base, "projects", projectId, "change-requests", crId] as const,
    },
    clientPortal: {
      projects: () => [...base, "projects", "portal", "projects"] as const,
      overview: (projectId: number) =>
        [...base, "projects", "portal", projectId, "overview"] as const,
      changeRequests: (projectId: number) =>
        [...base, "projects", "portal", projectId, "change-requests"] as const,
      visibility: (projectId: number) =>
        [...base, "projects", projectId, "client-visibility"] as const,
    },
    approvals: {
      inbox: () => [...base, "projects", "approvals", "inbox"] as const,
      list: (projectId: number, params?: Record<string, unknown>) =>
        params === undefined
          ? ([...base, "projects", projectId, "approvals"] as const)
          : ([...base, "projects", projectId, "approvals", params] as const),
      detail: (projectId: number, id: number) =>
        [...base, "projects", projectId, "approvals", id] as const,
    },
    risks: {
      list: (projectId: number, params?: Record<string, unknown>) =>
        params === undefined
          ? ([...base, "projects", projectId, "risks"] as const)
          : ([...base, "projects", projectId, "risks", params] as const),
      detail: (projectId: number, id: number) =>
        [...base, "projects", projectId, "risks", id] as const,
    },
    decisions: {
      list: (projectId: number, params?: Record<string, unknown>) =>
        params === undefined
          ? ([...base, "projects", projectId, "decisions"] as const)
          : ([...base, "projects", projectId, "decisions", params] as const),
      detail: (projectId: number, id: number) =>
        [...base, "projects", projectId, "decisions", id] as const,
    },
    meetings: {
      all: (projectId: number) =>
        [...base, "projects", projectId, "meetings"] as const,
      list: (projectId: number, params?: Record<string, unknown>) =>
        params === undefined
          ? ([...base, "projects", projectId, "meetings", "list"] as const)
          : ([
              ...base,
              "projects",
              projectId,
              "meetings",
              "list",
              params,
            ] as const),
      detail: (projectId: number, id: number) =>
        [...base, "projects", projectId, "meetings", id] as const,
    },
    incidents: {
      list: (projectId?: number, params?: Record<string, unknown>) =>
        params === undefined
          ? ([...base, "projects", projectId, "incidents"] as const)
          : ([...base, "projects", projectId, "incidents", params] as const),
      detail: (projectId?: number, id?: number) =>
        [...base, "projects", projectId, "incidents", id] as const,
    },
    forms: {
      list: (projectId: number, params?: Record<string, unknown>) =>
        params === undefined
          ? ([...base, "projects", projectId, "forms"] as const)
          : ([...base, "projects", projectId, "forms", params] as const),
      detail: (projectId: number, formId: number) =>
        [...base, "projects", projectId, "forms", formId] as const,
      submissions: (projectId: number, formId: number) =>
        [
          ...base,
          "projects",
          projectId,
          "forms",
          formId,
          "submissions",
        ] as const,
    },
    portfolios: {
      list: (params?: Record<string, unknown>) =>
        [...base, "projects", "portfolios", "list", params] as const,
      detail: (id: number) =>
        [...base, "projects", "portfolios", "detail", id] as const,
    },
    programs: {
      list: (params?: Record<string, unknown>) =>
        [...base, "projects", "programs", "list", params] as const,
      detail: (id: number) =>
        [...base, "projects", "programs", "detail", id] as const,
    },
    managedProducts: {
      list: (params?: Record<string, unknown>) =>
        [...base, "projects", "managed-products", "list", params] as const,
      detail: (id: number) =>
        [...base, "projects", "managed-products", "detail", id] as const,
    },
    pmWorkspaces: {
      list: (params?: Record<string, unknown>) =>
        [...base, "projects", "pm-workspaces", "list", params] as const,
      detail: (id: string) =>
        [...base, "projects", "pm-workspaces", "detail", id] as const,
      members: (id: string, params?: Record<string, unknown>) =>
        [...base, "projects", "pm-workspaces", "members", id, params] as const,
    },
    workflow: {
      transitions: (projectId: number) =>
        [...base, "projects", projectId, "workflow", "transitions"] as const,
    },
    allWork: (filters?: Record<string, unknown>) =>
      [...base, "projects", "all-work", filters] as const,
    allWorkInfinite: (filters: Record<string, unknown>) =>
      [...base, "projects", "all-work", filters, "infinite"] as const,
    webhooks: (projectId: number) =>
      [...base, "projects", projectId, "webhooks"] as const,
    webhookDeliveries: (projectId: number, webhookId: number) =>
      [...base, "projects", projectId, "webhooks", webhookId, "deliveries"] as const,
    workspaceViews: () => [...base, "projects", "workspace-views"] as const,
    agentTokens: () => [...base, "projects", "agent-tokens"] as const,
    commentDrafts: {
      mine: () => [...base, "projects", "comment-drafts", "mine"] as const,
    },
    commentPermalinkWithComment: (
      projectId: number,
      ticketId: number,
      commentId: string,
    ) =>
      [
        ...base,
        "projects",
        "comment-permalink",
        projectId,
        ticketId,
        commentId,
      ] as const,
    commentPermalinkTicket: (projectId: number, ticketId: number) =>
      [...base, "projects", "comment-permalink", projectId, ticketId] as const,
  },

  chat: {
    all: [...base, "chat"] as const,
    myChannels: (orgId?: string | null) =>
      orgId
        ? ([...base, "chat", "myChannels", orgId] as const)
        : ([...base, "chat", "myChannels"] as const),
    archivedChannels: () => [...base, "chat", "archivedChannels"] as const,
    publicChannels: () => [...base, "chat", "publicChannels"] as const,
    channel: (id: number) => [...base, "chat", "channel", id] as const,
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

  reports: {
    all: [...base, "reports"] as const,
    attendance: (params?: Record<string, unknown>) =>
      [...base, "reports", "attendance", params] as const,
    project: (params?: Record<string, unknown>) =>
      [...base, "reports", "project", params] as const,
    teamPerformance: (params?: Record<string, unknown>) =>
      [...base, "reports", "teamPerformance", params] as const,
    dashboardStats: () => [...base, "reports", "dashboardStats"] as const,
  },

  notifications: {
    all: [...base, "notifications"] as const,
    lists: (orgId: string | null | undefined = "") =>
      [...base, "notifications", orgId, "list"] as const,
    list: (
      params?: Record<string, unknown>,
      orgId: string | null | undefined = "",
    ) =>
      [...base, "notifications", orgId, "list", params] as const,
    unreadList: (orgId: string | null | undefined = "") =>
      [...base, "notifications", orgId, "list", "unread"] as const,
    unreadCount: (orgId: string | null | undefined = "") =>
      [...base, "notifications", orgId, "unreadCount"] as const,
    preferences: () => [...base, "notifications", "preferences"] as const,
    templates: (params?: Record<string, unknown>) =>
      [...base, "notifications", "templates", params] as const,
    template: (id: number) =>
      [...base, "notifications", "template", id] as const,
    broadcasts: (params?: Record<string, unknown>) =>
      [...base, "notifications", "broadcasts", params] as const,
    broadcast: (id: number) =>
      [...base, "notifications", "broadcast", id] as const,
    providers: () => [...base, "notifications", "providers"] as const,
    events: () => [...base, "notifications", "events"] as const,
    policy: () => [...base, "notifications", "policy"] as const,
    suppressions: () => [...base, "notifications", "suppressions"] as const,
  },

  invoice: {
    all: [...base, "invoice"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "invoice", "list", params] as const,
    detail: (id: number) => [...base, "invoice", "detail", id] as const,
    stats: () => [...base, "invoice", "stats"] as const,
  },

  support: {
    all: [...base, "support"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "support", "list", params] as const,
    detail: (id: number) => [...base, "support", "detail", id] as const,
  },

  organization: {
    all: [...base, "organization"] as const,
    archived: () => [...base, "organization", "archived"] as const,
    members: () => [...base, "organization", "members"] as const,
    settings: () => [...base, "organization", "settings"] as const,
  },

  orgSetup: {
    all: [...base, "org-setup"] as const,
    session: () => [...base, "org-setup", "session"] as const,
  },

  onboardingFlow: {
    all: [...base, "onboarding-flow"] as const,
    session: () => [...base, "onboarding-flow", "session"] as const,
    personalDetails: () =>
      [...base, "onboarding-flow", "personal-details"] as const,
    bankDetails: () =>
      [...base, "onboarding-flow", "bank-details"] as const,
    requirements: (country: string) =>
      [...base, "onboarding-flow", "requirements", country] as const,
    moduleChecklists: () =>
      [...base, "onboarding-flow", "module-checklists"] as const,
    moduleChecklist: (moduleKey: string) =>
      [...base, "onboarding-flow", "module-checklists", moduleKey] as const,
    tours: () => [...base, "onboarding-flow", "tours"] as const,
  },

  payments: {
    all: [...base, "payments"] as const,
    catalog: () => [...base, "payments", "catalog"] as const,
    providers: () => [...base, "payments", "providers"] as const,
    provider: (providerKey: string) =>
      [...base, "payments", "providers", providerKey] as const,
    testTransactions: (providerKey: string) =>
      [
        ...base,
        "payments",
        "providers",
        providerKey,
        "test-transactions",
      ] as const,
    webhookEvents: (providerKey: string) =>
      [
        ...base,
        "payments",
        "providers",
        providerKey,
        "webhook-events",
      ] as const,
    readiness: (providerKey: string) =>
      [...base, "payments", "providers", providerKey, "readiness"] as const,
    audit: (providerKey?: string) =>
      [...base, "payments", "audit", providerKey ?? "all"] as const,
  },

  access: {
    all: [...base, "access"] as const,
    me: (orgId?: string | null) =>
      orgId
        ? ([...base, "access", "me", orgId] as const)
        : ([...base, "access", "me"] as const),
    simulate: (orgId: string | null | undefined, userId: string) =>
      orgId
        ? ([...base, "access", "simulate", orgId, userId] as const)
        : ([...base, "access", "simulate", userId] as const),
    simulationCandidates: (
      orgId: string | null | undefined,
      params: { page: number; limit: number; search?: string },
    ) =>
      orgId
        ? ([...base, "access", "simulate", orgId, "candidates", params] as const)
        : ([...base, "access", "simulate", "candidates", params] as const),
    resourceGrants: (resourceType: string, resourceId: string) =>
      [...base, "access", "resource-grants", resourceType, resourceId] as const,
    orgModules: () => [...base, "access", "org-modules"] as const,
  },

  roles: {
    all: [...base, "roles"] as const,
    list: () => [...base, "roles", "list"] as const,
    permissionCatalog: () => [...base, "roles", "permission-catalog"] as const,
    detail: (id: number) => [...base, "roles", "detail", id] as const,
    permissions: (roleId: number) =>
      [...base, "roles", "permissions", roleId] as const,
    permissionsMatrix: () =>
      [...base, "roles", "permissions", "matrix"] as const,
    members: (roleId: number) => [...base, "roles", "members", roleId] as const,
    analytics: () => [...base, "roles", "analytics"] as const,
    departments: () => [...base, "roles", "departments"] as const,
  },

  branches: {
    all: [...base, "branches"] as const,
    list: () => [...base, "branches", "list"] as const,
    detail: (id: number) => [...base, "branches", "detail", id] as const,
  },

  crm: {
    all: [...base, "crm"] as const,
    salesDashboard: () => [...base, "crm", "salesDashboard"] as const,
    salesKpis: (params: Record<string, unknown>) =>
      [...base, "crm", "salesKpis", params] as const,
    salesFunnel: (params: Record<string, unknown>) =>
      [...base, "crm", "salesFunnel", params] as const,
    salesLeaderboard: (params: Record<string, unknown>) =>
      [...base, "crm", "salesLeaderboard", params] as const,
    revenueVsGoal: (year: number) =>
      [...base, "crm", "revenueVsGoal", year] as const,
    supportDashboard: () => [...base, "crm", "supportDashboard"] as const,
    customerExecutiveDashboard: () =>
      [...base, "crm", "customerExecutiveDashboard"] as const,
    person: (slug: string) => [...base, "crm", "person", slug] as const,
    peopleSlugs: () => [...base, "crm", "peopleSlugs"] as const,
  },

  crmSettings: {
    all: [...base, "crmSettings"] as const,
    assignmentRules: () => [...base, "crmSettings", "assignmentRules"] as const,
    emailTemplates: (params?: Record<string, unknown>) =>
      [...base, "crmSettings", "emailTemplates", params] as const,
    scoringRules: () => [...base, "crmSettings", "scoringRules"] as const,
    slaPolicies: () => [...base, "crmSettings", "slaPolicies"] as const,
    slaReport: () => [...base, "crmSettings", "slaReport"] as const,
    slaBreachedLeads: (params?: Record<string, unknown>) =>
      [...base, "crmSettings", "slaBreachedLeads", params] as const,
    territories: () => [...base, "crmSettings", "territories"] as const,
  },

  crmOrganizations: {
    all: [...base, "crmOrganizations"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "crmOrganizations", "list", params] as const,
    detail: (id: number) =>
      [...base, "crmOrganizations", "detail", id] as const,
    hierarchy: (id: number) =>
      [...base, "crmOrganizations", "hierarchy", id] as const,
    rollup: (id: number) =>
      [...base, "crmOrganizations", "rollup", id] as const,
    timeline: (id: number) =>
      [...base, "crmOrganizations", "timeline", id] as const,
    relatedLeads: (id: number) =>
      [...base, "crmOrganizations", "relatedLeads", id] as const,
    duplicates: (params?: Record<string, unknown>) =>
      [...base, "crmOrganizations", "duplicates", params] as const,
  },

  contactRoles: {
    all: [...base, "contactRoles"] as const,
    list: (contactId: number, params?: Record<string, unknown>) =>
      [...base, "contactRoles", "list", contactId, params] as const,
  },

  contactDuplicates: {
    all: [...base, "contactDuplicates"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "contactDuplicates", "list", params] as const,
  },

  customer360: {
    all: [...base, "customer360"] as const,
    company: (id: number) => [...base, "customer360", "company", id] as const,
    client: (id: number) => [...base, "customer360", "client", id] as const,
    companyTimeline: (id: number, cursor?: string) =>
      [...base, "customer360", "companyTimeline", id, cursor] as const,
  },

  dealActivities: {
    all: [...base, "dealActivities"] as const,
    list: (dealId: number, params?: Record<string, unknown>) =>
      [...base, "dealActivities", "list", dealId, params] as const,
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
    list: (params?: Record<string, unknown>) =>
      [...base, "auditLog", "list", params] as const,
    actions: () => [...base, "auditLog", "actions"] as const,
    targetTypes: () => [...base, "auditLog", "targetTypes"] as const,
  },

  sessions: {
    all: [...base, "sessions"] as const,
    list: () => [...base, "sessions", "list"] as const,
  },

  tasks: {
    all: [...base, "tasks"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "tasks", "list", params] as const,
    detail: (id: number) => [...base, "tasks", "detail", id] as const,
    myQueue: () => [...base, "tasks", "myQueue"] as const,
    overdue: () => [...base, "tasks", "overdue"] as const,
    overdueCount: () => [...base, "tasks", "overdueCount"] as const,
    sequences: () => [...base, "tasks", "sequences"] as const,
  },

  crmActivities: {
    all: [...base, "crmActivities"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "crmActivities", "list", params] as const,
  },

  blog: {
    all: [...base, "blog"] as const,
    feed: <P extends object>(params?: P) =>
      [...base, "blog", "feed", params] as const,
  },

  publicBooking: {
    all: [...base, "publicBooking"] as const,
    detail: (token: string) =>
      [...base, "publicBooking", "detail", token] as const,
  },

  accounting: {
    all: [...base, "accounting"] as const,
    accounts: <P extends object>(params?: P) =>
      [...base, "accounting", "accounts", params] as const,
    journal: <P extends object>(params?: P) =>
      [...base, "accounting", "journal", params] as const,
    journalEntry: (id: number) =>
      [...base, "accounting", "journalEntry", id] as const,
    trialBalance: (asOf: string) =>
      [...base, "accounting", "trialBalance", asOf] as const,
    profitLoss: (from: string, to: string) =>
      [...base, "accounting", "profitLoss", from, to] as const,
    customersOutstanding: <P extends object>(params?: P) =>
      [...base, "accounting", "customersOutstanding", params] as const,
    customerLedger: <P extends object>(clientId: number, params?: P) =>
      [...base, "accounting", "customerLedger", clientId, params] as const,
    gstr1: (params: { from: string; to: string }) =>
      [...base, "accounting", "gstr1", params] as const,
    balanceSheet: (params: { asOf: string }) =>
      [...base, "accounting", "balanceSheet", params] as const,
    agedReceivables: (params: { asOf: string }) =>
      [...base, "accounting", "agedReceivables", params] as const,
    purchaseBills: <P extends object>(params?: P) =>
      [...base, "accounting", "purchaseBills", params] as const,
    purchaseBill: (id: number) =>
      [...base, "accounting", "purchaseBill", id] as const,
    gstr3B: (params: { from: string; to: string }) =>
      [...base, "accounting", "gstr3B", params] as const,
    vendorsOutstanding: <P extends object>(params?: P) =>
      [...base, "accounting", "vendorsOutstanding", params] as const,
    vendorLedger: <P extends object>(vendorId: number, params?: P) =>
      [...base, "accounting", "vendorLedger", vendorId, params] as const,
    agedPayables: (params: { asOf: string }) =>
      [...base, "accounting", "agedPayables", params] as const,
    cashFlow: (params: { from: string; to: string }) =>
      [...base, "accounting", "cashFlow", params] as const,
    coaTemplates: () => [...base, "accounting", "coaTemplates"] as const,
    setupProgress: () => [...base, "accounting", "setupProgress"] as const,
    apAll: [...base, "accounting", "ap"] as const,
  },

  recurringInvoices: {
    all: [...base, "recurringInvoices"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "recurringInvoices", "list", params] as const,
    due: () => [...base, "recurringInvoices", "due"] as const,
  },

  goals: {
    all: [...base, "goals"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "goals", "list", params] as const,
    detail: (id: number) => [...base, "goals", "detail", id] as const,
    stats: () => [...base, "goals", "stats"] as const,
  },

  projectReports: {
    all: [...base, "projectReports"] as const,
    velocity: (projectId: number) =>
      [...base, "projectReports", "velocity", projectId] as const,
    burnup: (projectId: number, sprintId?: number) =>
      sprintId === undefined
        ? ([...base, "projectReports", "burnup", projectId] as const)
        : ([...base, "projectReports", "burnup", projectId, sprintId] as const),
    cfd: (projectId: number, params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "projectReports", "cfd", projectId] as const)
        : ([...base, "projectReports", "cfd", projectId, params] as const),
    criticalPath: (projectId: number) =>
      [...base, "projectReports", "criticalPath", projectId] as const,
    cycleTime: (projectId: number) =>
      [...base, "projectReports", "cycleTime", projectId] as const,
    leadTime: (projectId: number) =>
      [...base, "projectReports", "leadTime", projectId] as const,
  },

  whiteboards: {
    list: (projectId: number) =>
      [...base, "whiteboards", "list", projectId] as const,
    detail: (id: number) => [...base, "whiteboards", "detail", id] as const,
    publicLink: (token: string) =>
      [...base, "whiteboards", "publicLink", token] as const,
  },

  gitIntegration: {
    all: [...base, "gitIntegration"] as const,
    connections: () => [...base, "gitIntegration", "connections"] as const,
    ticketLinks: (ticketId: number) =>
      [...base, "gitIntegration", "ticketLinks", ticketId] as const,
  },

  ticketActivity: {
    all: [...base, "ticketActivity"] as const,
    list: (ticketId: number) =>
      [...base, "ticketActivity", "list", ticketId] as const,
  },

  supportActivity: {
    all: [...base, "supportActivity"] as const,
    list: (ticketId: number) =>
      [...base, "supportActivity", "list", ticketId] as const,
  },

  kbComments: {
    all: [...base, "kbComments"] as const,
    list: (articleId: number) =>
      [...base, "kbComments", "list", articleId] as const,
  },

  kbAttachments: {
    all: [...base, "kbAttachments"] as const,
    list: (articleId: number) =>
      [...base, "kbAttachments", "list", articleId] as const,
    publicList: (orgId: string, slug: string) =>
      [...base, "kbAttachments", "publicList", orgId, slug] as const,
  },

  playbook: {
    all: [...base, "playbook"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "playbook", "list", params] as const,
  },

  supportKb: {
    all: [...base, "supportKb"] as const,
    categories: () => [...base, "supportKb", "categories"] as const,
    articles: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "supportKb", "articles"] as const)
        : ([...base, "supportKb", "articles", params] as const),
    article: (articleId: number) =>
      [...base, "supportKb", "article", articleId] as const,
    publicArticles: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "supportKb", "publicArticles"] as const)
        : ([...base, "supportKb", "publicArticles", params] as const),
    publicArticle: (orgId: string, slug: string) =>
      [...base, "supportKb", "publicArticle", orgId, slug] as const,
  },

  kb: {
    all: [...base, "kb"] as const,
    kbPages: () => [...base, "kb", "pages"] as const,
    pagesTree: () => [...base, "kb", "pages", "tree"] as const,
    pagesTreeByProject: (projectId: number) =>
      [...base, "kb", "pages", "tree", "project", projectId] as const,
    pagesRecent: () => [...base, "kb", "pages", "recent"] as const,
    pagesFavorites: () => [...base, "kb", "pages", "favorites"] as const,
    pagesTrash: () => [...base, "kb", "pages", "trash"] as const,
    pagesSearch: (q: string) => [...base, "kb", "pages", "search", q] as const,
    page: (pageId: number) => [...base, "kb", "pages", pageId] as const,
    pageBacklinks: (pageId: number) =>
      [...base, "kb", "pages", pageId, "backlinks"] as const,
    pageVersions: (pageId: number) =>
      [...base, "kb", "pages", pageId, "versions"] as const,
    pageVersion: (pageId: number, versionNumber: number) =>
      [...base, "kb", "pages", pageId, "versions", versionNumber] as const,
    pageComments: (pageId: number) =>
      [...base, "kb", "pages", pageId, "comments"] as const,
    pageTemplates: () => [...base, "kb", "page-templates"] as const,
    spaces: () => [...base, "kb", "spaces"] as const,
    space: (spaceId: number) => [...base, "kb", "space", spaceId] as const,
    search: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "kb", "search"] as const)
        : ([...base, "kb", "search", params] as const),
    chatHistory: () => [...base, "kb", "chatHistory"] as const,
    chatConversations: () => [...base, "kb", "chatConversations"] as const,
    chatConversationMessages: (conversationId: number) =>
      [...base, "kb", "chatConversations", conversationId, "messages"] as const,
    analyticsOverview: (range?: Record<string, unknown>) =>
      range === undefined
        ? ([...base, "kb", "analyticsOverview"] as const)
        : ([...base, "kb", "analyticsOverview", range] as const),
    noResults: (range?: Record<string, unknown>) =>
      range === undefined
        ? ([...base, "kb", "noResults"] as const)
        : ([...base, "kb", "noResults", range] as const),
    pageReviews: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "kb", "pageReviews"] as const)
        : ([...base, "kb", "pageReviews", params] as const),
    pageReviewsDue: () => [...base, "kb", "pageReviewsDue"] as const,
    pageRecordLinks: (pageId: number) =>
      [...base, "kb", "pages", pageId, "record-links"] as const,
    recordLinksByRecord: (targetType: string, targetId: string) =>
      [
        ...base,
        "kb",
        "record-links",
        "by-record",
        targetType,
        targetId,
      ] as const,
    importJobs: () => [...base, "kb", "import-jobs"] as const,
    exportJobs: () => [...base, "kb", "export-jobs"] as const,
    articleMigrationPreview: () =>
      [...base, "kb", "article-migration", "preview"] as const,
    pageAnalytics: () => [...base, "kb", "pageAnalytics"] as const,
    knowledgeGaps: (range?: Record<string, unknown>) =>
      range === undefined
        ? ([...base, "kb", "knowledgeGaps"] as const)
        : ([...base, "kb", "knowledgeGaps", range] as const),
    contentGaps: (params?: Record<string, unknown>) =>
      [...base, "kb", "content-gaps", params] as const,
    researchBriefs: () => [...base, "kb", "research-briefs"] as const,
    researchBrief: (id: number) =>
      [...base, "kb", "research-brief", id] as const,
    settings: () => [...base, "kb", "settings"] as const,
    sources: () => [...base, "kb", "sources"] as const,
  },

  roadmap: {
    all: [...base, "roadmap"] as const,
    items: (params?: Record<string, unknown>) =>
      [...base, "roadmap", "items", params] as const,
    item: (id: number) => [...base, "roadmap", "item", id] as const,
    feedback: (params?: Record<string, unknown>) =>
      [...base, "roadmap", "feedback", params] as const,
    changelog: (params?: Record<string, unknown>) =>
      [...base, "roadmap", "changelog", params] as const,
    publicBoard: (orgId: string) =>
      [...base, "roadmap", "publicBoard", orgId] as const,
  },

  automations: {
    all: [...base, "automations"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "automations", "list", params] as const,
    detail: (id: number) => [...base, "automations", "detail", id] as const,
    runs: (ruleId: number) => [...base, "automations", "runs", ruleId] as const,
  },

  nps: {
    publicSurvey: (token: string) =>
      [...base, "nps", "publicSurvey", token] as const,
  },

  surveys: {
    all: [...base, "surveys"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "surveys", "list", params] as const,
    detail: (id: number) => [...base, "surveys", "detail", id] as const,
    templates: () => [...base, "surveys", "templates"] as const,
    builder: (id: number) => [...base, "surveys", "builder", id] as const,
    logic: (id: number) => [...base, "surveys", "logic", id] as const,
    collectors: (id: number) => [...base, "surveys", "collectors", id] as const,
    participants: (id: number, params?: Record<string, unknown>) =>
      [...base, "surveys", "participants", id, params] as const,
    publicSurvey: (token: string) =>
      [...base, "surveys", "publicSurvey", token] as const,
    assessmentAttempts: (id: number, params?: Record<string, unknown>) =>
      [...base, "surveys", "assessmentAttempts", id, params] as const,
    certificates: (id: number) =>
      [...base, "surveys", "certificates", id] as const,
    liveSession: (sessionId: number) =>
      [...base, "surveys", "liveSession", sessionId] as const,
    publicLiveSession: (sessionCode: string) =>
      [...base, "surveys", "publicLiveSession", sessionCode] as const,
    analyticsOverview: (id: number) =>
      [...base, "surveys", "analyticsOverview", id] as const,
    analyticsQuestions: (id: number) =>
      [...base, "surveys", "analyticsQuestions", id] as const,
    responses: (id: number, params?: Record<string, unknown>) =>
      [...base, "surveys", "responses", id, params] as const,
    response: (id: number, sessionId: number) =>
      [...base, "surveys", "response", id, sessionId] as const,
    automations: (id: number) =>
      [...base, "surveys", "automations", id] as const,
  },

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
    detail: (id: number) =>
      [...base, "supportPortalTickets", "detail", id] as const,
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
    list: () => [...base, "webhooks", "list"] as const,
  },

  workflows: {
    all: [...base, "workflows"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "workflows", "list", params] as const,
    detail: (id: string) => [...base, "workflows", id] as const,
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

  calendar: {
    all: [...base, "calendar"] as const,
    events: (start: string, end: string) =>
      [...base, "calendar", "events", start, end] as const,
    attendees: (eventId: number) =>
      [...base, "calendar", "attendees", eventId] as const,
    orgMembers: () => [...base, "calendar", "orgMembers"] as const,
    memberSearch: (search: string) =>
      [...base, "calendar", "memberSearch", search] as const,
    externalEvents: (start: string, end: string) =>
      [...base, "calendar", "externalEvents", start, end] as const,
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
    velocity: (params: Record<string, unknown>) =>
      [...base, "salesAnalytics", "velocity", params] as const,
    aging: (thresholdDays: number) =>
      [...base, "salesAnalytics", "aging", thresholdDays] as const,
    cycleLength: (repId?: string) =>
      [...base, "salesAnalytics", "cycleLength", repId] as const,
    lostAnalysis: (repId?: string) =>
      [...base, "salesAnalytics", "lostAnalysis", repId] as const,
    cohort: (months: number) =>
      [...base, "salesAnalytics", "cohort", months] as const,
    repComparison: (rep1Id?: number, rep2Id?: number) =>
      [...base, "salesAnalytics", "repComparison", rep1Id, rep2Id] as const,
    sourceReport: () => [...base, "salesAnalytics", "sourceReport"] as const,
  },

  hierarchy: {
    all: [...base, "hierarchy"] as const,
    businessUnits: (params?: Record<string, unknown>) =>
      [...base, "hierarchy", "businessUnits", params] as const,
    orgBranches: (params?: Record<string, unknown>) =>
      [...base, "hierarchy", "orgBranches", params] as const,
    departments: (params?: Record<string, unknown>) =>
      [...base, "hierarchy", "departments", params] as const,
    teams: (params?: Record<string, unknown>) =>
      [...base, "hierarchy", "teams", params] as const,
    locations: (params?: Record<string, unknown>) =>
      [...base, "hierarchy", "locations", params] as const,
    costCenters: (params?: Record<string, unknown>) =>
      [...base, "hierarchy", "costCenters", params] as const,
    tree: () => [...base, "hierarchy", "tree"] as const,
  },

  inventory: {
    all: [...base, "inventory"] as const,
    products: (params?: Record<string, unknown>) =>
      [...base, "inventory", "products", params] as const,
    product: (id: number) => [...base, "inventory", "product", id] as const,
    productVariants: (params?: Record<string, unknown>) =>
      [...base, "inventory", "productVariants", params] as const,
    categories: () => [...base, "inventory", "categories"] as const,
    uom: () => [...base, "inventory", "uom"] as const,
    warehouses: () => [...base, "inventory", "warehouses"] as const,
    warehouse: (id: number) => [...base, "inventory", "warehouse", id] as const,
    locations: (warehouseId: number) =>
      [...base, "inventory", "locations", warehouseId] as const,
    availability: (variantId: number, warehouseId?: number) =>
      [...base, "inventory", "availability", variantId, warehouseId] as const,
    reservations: (params?: Record<string, unknown>) =>
      [...base, "inventory", "reservations", params] as const,
    stockLevels: (params?: Record<string, unknown>) =>
      [...base, "inventory", "stockLevels", params] as const,
    stockTransactions: (params?: Record<string, unknown>) =>
      [...base, "inventory", "stockTransactions", params] as const,
    adjustments: (params?: Record<string, unknown>) =>
      [...base, "inventory", "adjustments", params] as const,
    transfers: (params?: Record<string, unknown>) =>
      [...base, "inventory", "transfers", params] as const,
    transfer: (id: number) => [...base, "inventory", "transfer", id] as const,
    vendors: (params?: Record<string, unknown>) =>
      [...base, "inventory", "vendors", params] as const,
    vendor: (id: number) => [...base, "inventory", "vendor", id] as const,
    purchaseOrders: (params?: Record<string, unknown>) =>
      [...base, "inventory", "purchaseOrders", params] as const,
    purchaseOrder: (id: number) =>
      [...base, "inventory", "purchaseOrder", id] as const,
    salesOrders: (params?: Record<string, unknown>) =>
      [...base, "inventory", "salesOrders", params] as const,
    salesOrder: (id: number) =>
      [...base, "inventory", "salesOrder", id] as const,
    dashboard: () => [...base, "inventory", "dashboard"] as const,
    stockSummary: (params?: object) =>
      [...base, "inventory", "stockSummary", params] as const,
    reorderReport: (params?: object) =>
      [...base, "inventory", "reorderReport", params] as const,
    movementsReport: (params?: object) =>
      [...base, "inventory", "movementsReport", params] as const,
    lots: (params?: Record<string, unknown>) =>
      [...base, "inventory", "lots", params] as const,
    lot: (id: number) => [...base, "inventory", "lot", id] as const,
    serials: (params?: Record<string, unknown>) =>
      [...base, "inventory", "serials", params] as const,
    serial: (id: number) => [...base, "inventory", "serial", id] as const,
    expiry: (params?: Record<string, unknown>) =>
      [...base, "inventory", "expiry", params] as const,
    traceability: (params?: Record<string, unknown>) =>
      [...base, "inventory", "traceability", params] as const,
    vendorReturns: (params?: Record<string, unknown>) =>
      [...base, "inventory", "vendorReturns", params] as const,
    vendorReturn: (id: number) =>
      [...base, "inventory", "vendorReturn", id] as const,
    customerReturns: (params?: Record<string, unknown>) =>
      [...base, "inventory", "customerReturns", params] as const,
    customerReturn: (id: number) =>
      [...base, "inventory", "customerReturn", id] as const,
    cycleCounts: (params?: Record<string, unknown>) =>
      [...base, "inventory", "cycleCounts", params] as const,
    cycleCount: (id: number) =>
      [...base, "inventory", "cycleCount", id] as const,
    physicalAudits: (params?: Record<string, unknown>) =>
      [...base, "inventory", "physicalAudits", params] as const,
    physicalAudit: (id: number) =>
      [...base, "inventory", "physicalAudit", id] as const,
    goodsReceipts: (params?: Record<string, unknown>) =>
      [...base, "inventory", "goodsReceipts", params] as const,
    goodsReceipt: (id: number) =>
      [...base, "inventory", "goodsReceipt", id] as const,
    replenishmentRules: (params?: Record<string, unknown>) =>
      [...base, "inventory", "replenishmentRules", params] as const,
    replenishmentSuggestions: (params?: object) =>
      [...base, "inventory", "replenishmentSuggestions", params] as const,
    forecasting: (params?: Record<string, unknown>) =>
      [...base, "inventory", "forecasting", params] as const,
    valuationReport: (params?: Record<string, unknown>) =>
      [...base, "inventory", "valuationReport", params] as const,
    valuationLayers: (variantId: number, page?: number) =>
      [...base, "inventory", "valuationLayers", variantId, page] as const,
    costingProducts: (params?: Record<string, unknown>) =>
      [...base, "inventory", "costingProducts", params] as const,
    slowMovingReport: (params?: object) =>
      [...base, "inventory", "slowMovingReport", params] as const,
    expiryReport: (params?: object) =>
      [...base, "inventory", "expiryReport", params] as const,
    qualityInspections: (params?: Record<string, unknown>) =>
      [...base, "inventory", "qualityInspections", params] as const,
    qualityInspection: (id: number) =>
      [...base, "inventory", "qualityInspection", id] as const,
    qualityHolds: (params?: Record<string, unknown>) =>
      [...base, "inventory", "qualityHolds", params] as const,
    recalls: (params?: Record<string, unknown>) =>
      [...base, "inventory", "recalls", params] as const,
    recall: (id: number) => [...base, "inventory", "recall", id] as const,
    packages: (params?: Record<string, unknown>) =>
      [...base, "inventory", "packages", params] as const,
    packageDetail: (id: number) =>
      [...base, "inventory", "packageDetail", id] as const,
    shipments: (params?: Record<string, unknown>) =>
      [...base, "inventory", "shipments", params] as const,
    shipment: (id: number) => [...base, "inventory", "shipment", id] as const,
    loads: (params?: Record<string, unknown>) =>
      [...base, "inventory", "loads", params] as const,
    load: (id: number) => [...base, "inventory", "load", id] as const,
    carriers: () => [...base, "inventory", "carriers"] as const,
    channels: () => [...base, "inventory", "channels"] as const,
    channel: (id: number) => [...base, "inventory", "channel", id] as const,
    channelPublications: (channelId: number) =>
      [...base, "inventory", "channelPublications", channelId] as const,
    threePlConnections: () =>
      [...base, "inventory", "threePlConnections"] as const,
    importJobs: (params?: Record<string, unknown>) =>
      [...base, "inventory", "importJobs", params] as const,
    importJob: (id: number) => [...base, "inventory", "importJob", id] as const,
    exportJobs: (params?: Record<string, unknown>) =>
      [...base, "inventory", "exportJobs", params] as const,
    exportJob: (id: number) => [...base, "inventory", "exportJob", id] as const,
    settings: () => [...base, "inventory", "settings"] as const,
    numberSequences: () => [...base, "inventory", "numberSequences"] as const,
    aiInsights: (params?: object) =>
      [...base, "inventory", "aiInsights", params] as const,
    aiDigest: (narrate?: boolean) =>
      [...base, "inventory", "aiDigest", narrate] as const,
    supplierDelayBriefing: (vendorId?: string) =>
      [...base, "inventory", "supplierDelayBriefing", vendorId] as const,
    barcodeLookup: (code: string) =>
      [...base, "inventory", "barcodeLookup", code] as const,
    qualityHold: (id: number) =>
      [...base, "inventory", "qualityHold", id] as const,
    webhooks: () => [...base, "inventory", "webhooks"] as const,
    webhookEvents: (webhookId: number, params?: Record<string, unknown>) =>
      [...base, "inventory", "webhookEvents", webhookId, params] as const,
  },

  apiTokens: {
    all: [...base, "apiTokens"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "apiTokens", "list", params] as const,
  },

  userApiTokens: {
    all: [...base, "userApiTokens"] as const,
    list: () => [...base, "userApiTokens", "list"] as const,
    permissions: () => [...base, "userApiTokens", "permissions"] as const,
  },

  users: {
    all: [...base, "users"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "users", "list", params] as const,
    detail: (id: string) => [...base, "users", "detail", id] as const,
    sessions: (userId: string) =>
      [...base, "users", "sessions", userId] as const,
    preferences: (userId: string) =>
      [...base, "users", "preferences", userId] as const,
    stats: () => [...base, "users", "stats"] as const,
    invitations: (params?: Record<string, unknown>) =>
      [...base, "users", "invitations", params] as const,
    loginHistory: (userId: string, params?: Record<string, unknown>) =>
      [...base, "users", "loginHistory", userId, params] as const,
    membership: (userId: string) =>
      [...base, "users", "membership", userId] as const,
    orgAuditLog: (params?: Record<string, unknown>) =>
      [...base, "users", "orgAuditLog", params] as const,
  },

  crmProducts: {
    all: [...base, "crmProducts"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "crmProducts", "list", params] as const,
    detail: (id: number) => [...base, "crmProducts", "detail", id] as const,
  },

  crmQuotes: {
    all: [...base, "crmQuotes"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "crmQuotes", "list", params] as const,
    byDeal: (dealId: number) =>
      [...base, "crmQuotes", "byDeal", dealId] as const,
    detail: (id: number) => [...base, "crmQuotes", "detail", id] as const,
  },

  crmPricebooks: {
    all: [...base, "crmPricebooks"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "crmPricebooks", "list", params] as const,
    detail: (id: string) => [...base, "crmPricebooks", "detail", id] as const,
    entries: (pricebookId: string) =>
      [...base, "crmPricebooks", "entries", pricebookId] as const,
  },
  crmQuoteSettings: {
    all: [...base, "crmQuoteSettings"] as const,
  },
  crmQuoteTemplates: {
    all: [...base, "crmQuoteTemplates"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "crmQuoteTemplates", "list", params] as const,
  },

  timesheets: {
    all: [...base, "timesheets"] as const,
    payroll: {
      all: [...base, "timesheets", "payroll"] as const,
      summary: (params: Record<string, unknown>) =>
        [...base, "timesheets", "payroll", "summary", params] as const,
      exports: (page: number, pageSize: number) =>
        [...base, "timesheets", "payroll", "exports", page, pageSize] as const,
      exportRows: (exportId: number) =>
        [
          ...base,
          "timesheets",
          "payroll",
          "exports",
          exportId,
          "rows",
        ] as const,
      settings: () => [...base, "timesheets", "payroll", "settings"] as const,
    },
    entries: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "entries", params] as const,
    timerActive: () => [...base, "timesheets", "timer", "active"] as const,
    periods: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "periods", "list", params] as const,
    periodCurrent: () => [...base, "timesheets", "periods", "current"] as const,
    period: (periodId: number) =>
      [...base, "timesheets", "periods", "detail", periodId] as const,
    approvals: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "approvals", params] as const,
    billingUninvoiced: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "billing", "uninvoiced", params] as const,
    ratePreview: (params: Record<string, unknown>) =>
      [...base, "timesheets", "billing", "rate-preview", params] as const,
    reportsOverview: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "reports", "overview", params] as const,
    teamWeekSummary: (params: Record<string, unknown>) =>
      [...base, "timesheets", "team", "week-summary", params] as const,
    report: (tab: string, params?: Record<string, unknown>) =>
      [...base, "timesheets", "reports", tab, params] as const,
    exceptions: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "exceptions", "list", params] as const,
    exceptionsSummary: () =>
      [...base, "timesheets", "exceptions", "summary"] as const,
    settingsHistory: () =>
      [...base, "timesheets", "settings", "history"] as const,
    settings: () => [...base, "timesheets", "settings"] as const,
    rates: () => [...base, "timesheets", "rates"] as const,
    budgets: () => [...base, "timesheets", "budgets"] as const,
    audit: (params?: Record<string, unknown>) =>
      [...base, "timesheets", "audit", params] as const,
  },

  payroll: {
    all: [...base, "payroll"] as const,
    templates: (params?: Record<string, unknown>) =>
      [...base, "payroll", "templates", params] as const,
    template: (id: number) => [...base, "payroll", "template", id] as const,
    templatePreview: (id: number, ctc: string) =>
      [...base, "payroll", "template", id, "preview", ctc] as const,
    policy: () => [...base, "payroll", "policy"] as const,
    policyVersions: (policyId: number) =>
      [...base, "payroll", "policy", policyId, "versions"] as const,
    toggleImpact: (toggle: string) =>
      [...base, "payroll", "toggle-impact", toggle] as const,
    policyPreview: (params?: Record<string, unknown>) =>
      [...base, "payroll", "policy", "preview", params] as const,
    components: (params?: Record<string, unknown>) =>
      [...base, "payroll", "components", params] as const,
    runApprovals: (runId: number) =>
      [...base, "payroll", "runs", runId, "approvals"] as const,
    bankValidation: (runId: number) =>
      [...base, "payroll", "runs", runId, "payout", "validation"] as const,
    bankBatches: (runId?: number) =>
      [...base, "payroll", "payout", "batches", runId] as const,
    bankBatch: (batchId: number) =>
      [...base, "payroll", "payout", "batches", batchId] as const,
    employeeBank: (employeeUserId: string) =>
      [...base, "payroll", "employees", employeeUserId, "bank"] as const,
    payslipTemplates: () => [...base, "payroll", "payslip-templates"] as const,
    runPublications: (runId: number) =>
      [...base, "payroll", "runs", runId, "payslips"] as const,
    runs: (params?: Record<string, unknown>) =>
      [...base, "payroll", "runs", params] as const,
    run: (runId: number) => [...base, "payroll", "runs", runId] as const,
    reports: (kind: string, params?: Record<string, unknown>) =>
      [...base, "payroll", "reports", kind, params] as const,
    journal: (month: string) => [...base, "payroll", "journal", month] as const,
    journalBatchesAll: [...base, "payroll", "journal-batches"] as const,
    periodReconciliation: (periodKey: string) =>
      [...base, "payroll", "period-reconciliation", periodKey] as const,
    journalBatches: (params?: Record<string, unknown>) =>
      [...base, "payroll", "journal-batches", "list", params] as const,
    journalBatch: (batchId: number) =>
      [...base, "payroll", "journal-batches", batchId] as const,
    accountingMappings: () =>
      [...base, "payroll", "accounting-mappings"] as const,
    calendar: (params?: Record<string, unknown>) =>
      [...base, "payroll", "calendar", params] as const,
    taxWindows: () => [...base, "payroll", "tax-windows"] as const,
    taxDeclarations: (params?: Record<string, unknown>) =>
      [...base, "payroll", "tax-declarations", params] as const,
    fnfAll: [...base, "payroll", "fnf"] as const,
    fnfList: () => [...base, "payroll", "fnf", "list"] as const,
    fnfSettlement: (settlementId: number) =>
      [...base, "payroll", "fnf", settlementId] as const,
    fnfStatement: (settlementId: number) =>
      [...base, "payroll", "fnf", settlementId, "statement"] as const,
    loanAdjustments: () => [...base, "payroll", "loan-adjustments"] as const,
    commandCenterAll: [...base, "payroll", "command-center"] as const,
    commandCenter: (month: string) =>
      [...base, "payroll", "command-center", month] as const,
    employees: (params?: Record<string, unknown>) =>
      [...base, "payroll", "employees", "list", params] as const,
    employee: (employeeUserId: string) =>
      [...base, "payroll", "employees", employeeUserId] as const,
    employeeHistory: (employeeUserId: string) =>
      [...base, "payroll", "employees", employeeUserId, "history"] as const,
    worker: (workerId: string) => [...base, "payroll", "workers", workerId] as const,
    runEmployeesAll: (runId: number) =>
      [...base, "payroll", "run-employees", runId] as const,
    runEmployeesList: (runId: number, params?: Record<string, unknown>) =>
      [...base, "payroll", "run-employees", runId, "list", params] as const,
    runEmployee: (runId: number, runEmployeeId: number) =>
      [...base, "payroll", "run-employees", runId, runEmployeeId] as const,
    runVariance: (runId: number) =>
      [...base, "payroll", "run-variance", runId] as const,
    runExceptionsAll: (runId: number) =>
      [...base, "payroll", "run-exceptions", runId] as const,
    runExceptions: (runId: number, params?: Record<string, unknown>) =>
      [...base, "payroll", "run-exceptions", runId, "list", params] as const,
    runInputsAll: (runId: number) =>
      [...base, "payroll", "run-inputs", runId] as const,
    runInputs: (runId: number, params?: Record<string, unknown>) =>
      [...base, "payroll", "run-inputs", runId, "list", params] as const,
    calendarAll: [...base, "payroll", "calendar"] as const,
    taxDeclarationsAll: [...base, "payroll", "tax-declarations"] as const,
    entitiesAll: [...base, "payroll", "entities"] as const,
    entityCountryPacks: () =>
      [...base, "payroll", "entities", "country-packs"] as const,
    entityContext: (entityId: number) =>
      [...base, "payroll", "entities", entityId, "context"] as const,
    filingsAll: [...base, "payroll", "filings"] as const,
    filingCapabilities: () =>
      [...base, "payroll", "filings", "capabilities"] as const,
    loansAdmin: () => [...base, "payroll", "loans-admin"] as const,
    bonuses: () => [...base, "payroll", "bonuses"] as const,
    incentivesAll: [...base, "payroll", "incentives"] as const,
    incentives: (params?: Record<string, unknown>) =>
      [...base, "payroll", "incentives", "list", params] as const,
    essAll: [...base, "payroll", "ess"] as const,
    essOverview: () => [...base, "payroll", "ess", "overview"] as const,
    essPayslips: () => [...base, "payroll", "ess", "payslips"] as const,
    essSalaryStructure: () =>
      [...base, "payroll", "ess", "salary-structure"] as const,
    essReimbursements: () =>
      [...base, "payroll", "ess", "reimbursements"] as const,
    essLoans: () => [...base, "payroll", "ess", "loans"] as const,
    essTaxDeclaration: () =>
      [...base, "payroll", "ess", "tax-declaration"] as const,
    essBank: () => [...base, "payroll", "ess", "bank"] as const,
    essFnf: () => [...base, "payroll", "ess", "fnf"] as const,
    essTotalRewards: () =>
      [...base, "payroll", "ess", "total-rewards"] as const,
    managerInbox: () => [...base, "payroll", "manager", "inbox"] as const,
    teamRewards: () => [...base, "payroll", "manager", "team-rewards"] as const,
    orgPayCompression: () =>
      [...base, "payroll", "analytics", "pay-compression"] as const,
  },

  hrPayrollInputs: {
    all: [...base, "hr-payroll-inputs"] as const,
    periods: (params?: Record<string, unknown>) =>
      [...base, "hr-payroll-inputs", "periods", params] as const,
    period: (periodId: number) =>
      [...base, "hr-payroll-inputs", "periods", periodId] as const,
    section: (
      periodId: number,
      section: string,
      params?: Record<string, unknown>,
    ) =>
      [
        ...base,
        "hr-payroll-inputs",
        "periods",
        periodId,
        section,
        params,
      ] as const,
    adjustments: (periodId: number, params?: Record<string, unknown>) =>
      [
        ...base,
        "hr-payroll-inputs",
        "periods",
        periodId,
        "adjustments",
        params,
      ] as const,
  },

  feedbucket: {
    all: [...base, "feedbucket"] as const,
    widgets: () => [...base, "feedbucket", "widgets"] as const,
    widget: (id: number) => [...base, "feedbucket", "widgets", id] as const,
    submissions: (params?: Record<string, unknown>) =>
      [...base, "feedbucket", "submissions", params] as const,
    submission: (id: number) =>
      [...base, "feedbucket", "submissions", id] as const,
  },

  crmMetadata: {
    all: [...base, "crmMetadata"] as const,
    detail: () => [...base, "crmMetadata", "detail"] as const,
    options: (type: string) =>
      [...base, "crmMetadata", "options", type] as const,
    validationRules: (params?: Record<string, unknown>) =>
      [...base, "crmMetadata", "validationRules", params] as const,
    blueprints: (params?: Record<string, unknown>) =>
      [...base, "crmMetadata", "blueprints", params] as const,
    blueprintTransitions: (blueprintId: string | null) =>
      [...base, "crmMetadata", "blueprints", blueprintId, "transitions"] as const,
  },

  crmCampaigns: {
    all: [...base, "crmCampaigns"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "crmCampaigns", "list", params] as const,
    detail: (id: number) => [...base, "crmCampaigns", "detail", id] as const,
    roi: (id: number) => [...base, "crmCampaigns", "roi", id] as const,
    leads: (id: number, params?: Record<string, unknown>) =>
      [...base, "crmCampaigns", "leads", id, params] as const,
    attribution: (model: string) =>
      [...base, "crmCampaigns", "attribution", model] as const,
  },

  crmAutomations: {
    all: [...base, "crmAutomations"] as const,
    list: () => [...base, "crmAutomations", "list"] as const,
    events: () => [...base, "crmAutomations", "events"] as const,
    actions: () => [...base, "crmAutomations", "actions"] as const,
    runs: (ruleId: number, page: number) =>
      [...base, "crmAutomations", "runs", ruleId, page] as const,
  },

  crmSequences: {
    all: [...base, "crmSequences"] as const,
    list: () => [...base, "crmSequences", "list"] as const,
    steps: (sequenceId: string) =>
      [...base, "crmSequences", "steps", sequenceId] as const,
    enrollments: (sequenceId: string, page: number) =>
      [...base, "crmSequences", "enrollments", sequenceId, page] as const,
  },

  crmInbox: {
    all: [...base, "crmInbox"] as const,
    data: () => [...base, "crmInbox", "data"] as const,
    counts: () => [...base, "crmInbox", "counts"] as const,
  },

  signEnvelopes: {
    all: [...base, "signEnvelopes"] as const,
    list: (params?: Record<string, unknown>) =>
      [...base, "signEnvelopes", "list", params] as const,
    detail: (id: number) => [...base, "signEnvelopes", "detail", id] as const,
    audit: (id: number) => [...base, "signEnvelopes", "audit", id] as const,
    certificate: (id: number) =>
      [...base, "signEnvelopes", "certificate", id] as const,
  },

  signDocuments: {
    all: [...base, "signDocuments"] as const,
    list: (envelopeId: number) =>
      [...base, "signDocuments", "list", envelopeId] as const,
    preview: (documentId: number) =>
      [...base, "signDocuments", "preview", documentId] as const,
  },

  signTemplates: {
    all: [...base, "signTemplates"] as const,
    list: () => [...base, "signTemplates", "list"] as const,
    detail: (id: number) => [...base, "signTemplates", "detail", id] as const,
  },

  signBulkSend: {
    all: [...base, "signBulkSend"] as const,
    job: (id: number) => [...base, "signBulkSend", "job", id] as const,
  },

  signAdmin: {
    settings: () => [...base, "signAdmin", "settings"] as const,
    watermarkPolicies: () =>
      [...base, "signAdmin", "watermarkPolicies"] as const,
  },

  signPublic: {
    session: (token: string) =>
      [...base, "signPublic", "session", token] as const,
    form: (slug: string) => [...base, "signPublic", "form", slug] as const,
  },

  billing: {
    all: [...base, "billing"] as const,
    aiCredits: () => [...base, "billing", "ai-credits"] as const,
    aiCreditTransactions: (params: Record<string, unknown>) =>
      [...base, "billing", "ai-credits", "transactions", params] as const,
    aiCreditsUsage: (days: number) =>
      [...base, "billing", "ai-credits", "usage", { days }] as const,
    entitlements: () => [...base, "billing", "entitlements"] as const,
    subscription: () => [...base, "billing", "subscription"] as const,
    summary: () => [...base, "billing", "summary"] as const,
    plans: () => [...base, "billing", "plans"] as const,
    coupon: (code: string, plan: string | null) =>
      [...base, "billing", "coupon", code, plan] as const,
    profile: () => [...base, "billing", "profile"] as const,
    seats: () => [...base, "billing", "seats"] as const,
  },

  crmDataQuality: {
    all: [...base, "crm", "data-quality"] as const,
    report: () => [...base, "crm", "data-quality", "report"] as const,
  },

  aiSummaries: {
    all: [...base, "aiSummaries"] as const,
    latest: (entityType: string, entityId: string) =>
      [...base, "aiSummaries", entityType, entityId] as const,
  },

  meetingsAi: {
    all: [...base, "ai", "meetings"] as const,
  },

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
    people: (params?: Record<string, unknown>) =>
      [...base, "directory", "people", params] as const,
    person: (organizationPersonId: string) =>
      [...base, "directory", "people", organizationPersonId] as const,
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
    auditLog: (moduleKey: string, params: { page: number; pageSize: number }) =>
      [...base, "moduleAccess", moduleKey, "audit-log", params] as const,
    myPermissions: (moduleKey: string) =>
      [...base, "moduleAccess", moduleKey, "me", "permissions"] as const,
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
    incident: (id: number) => [...base, "hr-safety", "incident", id] as const,
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
