import { queryKeyBase as base } from "./base";

export const humanResourcesQueryKeys = {
  hr: {
    all: [...base, "hr"] as const,
    hub: (today: string) => [...base, "hr", "hub", today] as const,
    departments: () => [...base, "hr", "departments"] as const,
    legacyDepartments: () => [...base, "hr", "departments", "legacy"] as const,
    employees: (params?: Record<string, unknown>) =>
      [...base, "hr", "employees", params] as const,
    employee: (employeeUserId: string) =>
      [...base, "hr", "employees", employeeUserId] as const,
    attendanceStatus: () => [...base, "hr", "attendanceStatus"] as const,
    attendanceLogs: (params?: Record<string, unknown>) =>
      [...base, "hr", "attendanceLogs", params] as const,
    attendanceHistory: (params: { page: number; limit: number }) =>
      [...base, "hr", "attendanceHistory", params] as const,
    leaves: (
      orgId: string | null | undefined = "",
      userId: string | null | undefined = "",
      accessVersion: number | null | undefined = 0,
      params?: Record<string, unknown>,
    ) => [...base, "hr", orgId, userId, accessVersion, "leaves", params] as const,
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
    documentsAll: [...base, "hr", "documents"] as const,
    performanceReviews: (params?: Record<string, unknown>) =>
      [...base, "hr", "performanceReviews", params] as const,
    performanceReviewsAll: [...base, "hr", "performanceReviews"] as const,
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
    jobPosting: (jobPostingId: number) =>
      [...base, "hr", "jobPosting", jobPostingId] as const,
    candidates: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "hr", "candidates"] as const)
        : ([...base, "hr", "candidates", params] as const),
    candidate: (candidateId: number) =>
      [...base, "hr", "candidate", candidateId] as const,
    interviews: (params?: Record<string, unknown>) =>
      params !== undefined
        ? ([...base, "hr", "interviews", params] as const)
        : ([...base, "hr", "interviews"] as const),
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
    reviewCycle: (reviewCycleId: number) =>
      [...base, "hr", "reviewCycle", reviewCycleId] as const,
    oneOnOnes: (params?: Record<string, unknown>) =>
      [...base, "hr", "oneOnOnes", params] as const,
    terminations: () => [...base, "hr", "terminations"] as const,
    termination: (terminationId: number) =>
      [...base, "hr", "termination", terminationId] as const,
    documentTypes: () => [...base, "hr", "documentTypes"] as const,
    onboardingDocsAll: [...base, "hr", "onboardingDocs"] as const,
    onboardingDocs: (params?: Record<string, unknown>) =>
      [...base, "hr", "onboardingDocs", params] as const,
    onboardingDocsSummary: (params?: Record<string, unknown>) =>
      [...base, "hr", "onboardingDocs", "summary", params] as const,
    documentsStats: () => [...base, "hr", "documentsStats"] as const,
    documentsExpiry: (days: number) =>
      [...base, "hr", "documentsExpiry", days] as const,
    documentsExpiryAll: [...base, "hr", "documentsExpiry"] as const,
    myOnboardingDocs: () => [...base, "hr", "myOnboardingDocs"] as const,
    teams: (teamId?: string) => [...base, "hr", "teams", teamId] as const,
    diversityReport: () => [...base, "hr", "diversityReport"] as const,
    bookingLinks: () => [...base, "hr", "bookingLinks"] as const,
    documentTemplates: (params?: Record<string, unknown>) =>
      [...base, "hr", "documentTemplates", params] as const,
    documentTemplate: (documentTemplateId: number) =>
      [...base, "hr", "documentTemplate", documentTemplateId] as const,
    candidateDocuments: (candidateId: number) =>
      [...base, "hr", "candidateDocuments", candidateId] as const,
    rolloutDocuments: (candidateId: number) =>
      [...base, "hr", "rolloutDocuments", candidateId] as const,
    leavesMyOwn: () => [...base, "hr", "leaves", "my"] as const,
    leavesTeam: (
      orgId: string | null | undefined = "",
      userId: string | null | undefined = "",
      accessVersion: number | null | undefined = 0,
    ) => [...base, "hr", orgId, userId, accessVersion, "leaves", "team"] as const,
    leavesThisWeek: (
      orgId: string | null | undefined = "",
      userId: string | null | undefined = "",
      accessVersion: number | null | undefined = 0,
    ) => [...base, "hr", orgId, userId, accessVersion, "leavesThisWeek"] as const,
    leavesMyRequests: (
      orgId: string | null | undefined = "",
      userId: string | null | undefined = "",
      accessVersion: number | null | undefined = 0,
    ) => [...base, "hr", orgId, userId, accessVersion, "leavesMyRequests"] as const,
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
    hiringFlow: (hiringFlowId: number) =>
      [...base, "hr", "hiringFlow", hiringFlowId] as const,
    hiringFlowRounds: (flowId: number) =>
      [...base, "hr", "hiringFlowRounds", flowId] as const,
    emailSequences: () => [...base, "hr", "emailSequences"] as const,
    emailSequence: (emailSequenceId: number) =>
      [...base, "hr", "emailSequence", emailSequenceId] as const,
    pipelineAutomations: () => [...base, "hr", "pipelineAutomations"] as const,
    referrals: () => [...base, "hr", "referrals"] as const,
    talentPools: () => [...base, "hr", "talentPools"] as const,
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
    feedbackCycle: (feedbackCycleId: number) =>
      [...base, "hr", "feedbackCycle", feedbackCycleId] as const,
    myPendingReviews: () => [...base, "hr", "myPendingReviews"] as const,
    feedbackResults: (subjectId: string) =>
      [...base, "hr", "feedbackResults", subjectId] as const,
    hrTemplates: (params?: Record<string, unknown>) =>
      [...base, "hr", "templates", params] as const,
    hrTemplate: (hrTemplateId: number) =>
      [...base, "hr", "template", hrTemplateId] as const,
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
    orgRoles: () => [...base, "hr", "org", "roles"] as const,
    orgLevels: () => [...base, "hr", "org", "levels"] as const,
    orgHeadcount: (groupBy: string) =>
      [...base, "hr", "org", "headcount", groupBy] as const,
    probationList: () => [...base, "hr", "probation", "list"] as const,
    exitChecklist: (resignationId: number) =>
      [...base, "hr", "exit", "checklist", resignationId] as const,
    workAuthorizations: (params?: Record<string, unknown>) =>
      [...base, "hr", "global", "workAuthorizations", params] as const,
    workAuthorization: (workAuthorizationId: number) =>
      [...base, "hr", "global", "workAuthorization", workAuthorizationId] as const,
    complianceRequirements: (params?: Record<string, unknown>) =>
      [...base, "hr", "global", "complianceRequirements", params] as const,
    complianceRequirement: (complianceRequirementId: number) =>
      [
        ...base,
        "hr",
        "global",
        "complianceRequirement",
        complianceRequirementId,
      ] as const,
    complianceEvents: (params?: Record<string, unknown>) =>
      [...base, "hr", "global", "complianceEvents", params] as const,
    contracts: (params?: Record<string, unknown>) =>
      [...base, "hr", "global", "contracts", params] as const,
    contract: (contractId: number) =>
      [...base, "hr", "global", "contract", contractId] as const,
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
    settingsHubVersions: (entity: string, entityId: number | null) =>
      [...base, "hr", "settings-hub", "versions", entity, entityId] as const,
    holidays: () => [...base, "hr", "holidays"] as const,
    importJobs: (entity?: string) =>
      [...base, "hr", "import", "jobs", entity ?? "all"] as const,
    importJob: (jobId: string) =>
      [...base, "hr", "import", "jobs", jobId] as const,
    employeeExportJob: (
      orgId: string,
      actorUserId: string,
      accessVersion: number,
      exportJobId: string,
    ) =>
      [
        ...base,
        "hr",
        orgId,
        actorUserId,
        accessVersion,
        "employee-export",
        exportJobId,
      ] as const,
    expenseExportJob: (jobId: string) =>
      [...base, "hr", "expenses", "export", "jobs", jobId] as const,
    hrCalendar: (from: string, to: string, types?: string) =>
      [...base, "hr", "calendar", from, to, types] as const,
    benefitsAll: [...base, "hr", "benefits"] as const,
    benefitPlans: (params?: Record<string, unknown>) =>
      [...base, "hr", "benefits", "plans", params] as const,
    benefitPlan: (benefitPlanId: number) =>
      [...base, "hr", "benefits", "plans", benefitPlanId] as const,
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
    hrPolicyDetail: (hrPolicyId: number) =>
      [...base, "hr", "policies", "detail", hrPolicyId] as const,
  },
} as const;
