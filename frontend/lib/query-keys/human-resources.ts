import { queryKeyBase as base, type QueryKeyParams } from "./base";

export const humanResourcesQueryKeys = {
  hr: {
    all: [...base, "hr"] as const,
    hub: (today: string) => [...base, "hr", "hub", today] as const,
    departments: () => [...base, "hr", "departments"] as const,
    employees: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "employees"] as const)
        : ([...base, "hr", "employees", params] as const),
    employeeCounts: (params: QueryKeyParams) =>
      [...base, "hr", "employees", "counts", params] as const,
    employee: (employeeUserId: string) =>
      [...base, "hr", "employees", employeeUserId] as const,
    attendanceStatus: () => [...base, "hr", "attendanceStatus"] as const,
    attendanceHistory: (params: { cursor?: string; limit: number }) =>
      [...base, "hr", "attendanceHistory", params] as const,
    leaves: (orgId: string | null | undefined = "", userId: string | null | undefined = "", accessVersion: number | null | undefined = 0, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", orgId, userId, accessVersion, "leaves"] as const)
        : ([...base, "hr", orgId, userId, accessVersion, "leaves", params] as const),
    expenses: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "expenses"] as const)
        : ([...base, "hr", "expenses", params] as const),
    assets: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "assets"] as const)
        : ([...base, "hr", "assets", params] as const),
    documents: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "documents"] as const)
        : ([...base, "hr", "documents", params] as const),
    documentsAll: [...base, "hr", "documents"] as const,
    documentClassification: (documentId: number) =>
      [...base, "hr", "documents", "classification", documentId] as const,
    documentKbLink: (documentId: number) =>
      [...base, "hr", "documents", "kbLink", documentId] as const,
    documentVersions: (documentId: number) =>
      [...base, "hr", "documents", "versions", documentId] as const,
    performanceReviews: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "performanceReviews"] as const)
        : ([...base, "hr", "performanceReviews", params] as const),
    performanceReviewsAll: [...base, "hr", "performanceReviews"] as const,
    goals: (userId?: string) =>
      userId === undefined
        ? ([...base, "hr", "goals"] as const)
        : ([...base, "hr", "goals", userId] as const),
    workLogs: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "workLogs"] as const)
        : ([...base, "hr", "workLogs", params] as const),
    orgChart: () => [...base, "hr", "orgChart"] as const,
    wfhRequests: () => [...base, "hr", "wfhRequests"] as const,
    pendingWfhRequests: () => [...base, "hr", "pendingWfhRequests"] as const,
    holidaysCalendar: (params: { year: number; month: number }) =>
      [...base, "hr", "holidaysCalendar", params] as const,
    monthlyAttendance: (params: {
      userId?: string;
      year: number;
      month: number;
    }) => [...base, "hr", "monthlyAttendance", params] as const,
    employeeStats: (userId: string) =>
      [...base, "hr", "employeeStats", userId] as const,

    recruitmentStats: () => [...base, "hr", "recruitmentStats"] as const,
    jobPostings: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "jobPostings"] as const)
        : ([...base, "hr", "jobPostings", params] as const),
    jobPosting: (jobPostingId: number) =>
      [...base, "hr", "jobPosting", jobPostingId] as const,
    candidates: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "candidates"] as const)
        : ([...base, "hr", "candidates", params] as const),
    candidate: (candidateId: number) =>
      [...base, "hr", "candidate", candidateId] as const,
    interviews: (params?: QueryKeyParams) =>
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
    oneOnOnes: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "oneOnOnes"] as const)
        : ([...base, "hr", "oneOnOnes", params] as const),
    termination: (terminationId: number) =>
      [...base, "hr", "termination", terminationId] as const,
    documentTypes: () => [...base, "hr", "documentTypes"] as const,
    onboardingDocsAll: [...base, "hr", "onboardingDocs"] as const,
    onboardingDocs: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "onboardingDocs"] as const)
        : ([...base, "hr", "onboardingDocs", params] as const),
    onboardingDocsSummary: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "onboardingDocs", "summary"] as const)
        : ([...base, "hr", "onboardingDocs", "summary", params] as const),
    documentsStats: () => [...base, "hr", "documentsStats"] as const,
    documentsExpiry: (days: number) =>
      [...base, "hr", "documentsExpiry", days] as const,
    documentsExpiryAll: [...base, "hr", "documentsExpiry"] as const,
    myOnboardingDocs: () => [...base, "hr", "myOnboardingDocs"] as const,
    teams: (teamId?: string) =>
      teamId === undefined
        ? ([...base, "hr", "teams"] as const)
        : ([...base, "hr", "teams", teamId] as const),
    diversityReport: () => [...base, "hr", "diversityReport"] as const,
    bookingLinks: () => [...base, "hr", "bookingLinks"] as const,
    documentTemplates: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "documentTemplates"] as const)
        : ([...base, "hr", "documentTemplates", params] as const),
    documentTemplate: (documentTemplateId: number) =>
      [...base, "hr", "documentTemplate", documentTemplateId] as const,
    candidateDocuments: (candidateId: number) =>
      [...base, "hr", "candidateDocuments", candidateId] as const,
    rolloutDocuments: (candidateId: number) =>
      [...base, "hr", "rolloutDocuments", candidateId] as const,
    leavesTeam: (
      orgId: string,
      userId: string,
      accessVersion: number,
    ) => [...base, "hr", orgId, userId, accessVersion, "leaves", "team"] as const,
    leavesThisWeek: (
      orgId: string,
      userId: string,
      accessVersion: number,
    ) => [...base, "hr", orgId, userId, accessVersion, "leavesThisWeek"] as const,
    leavesMyRequests: (
      orgId: string,
      userId: string,
      accessVersion: number,
    ) => [...base, "hr", orgId, userId, accessVersion, "leavesMyRequests"] as const,
    leavesMyRequestsPages: (
      orgId: string,
      userId: string,
      accessVersion: number,
    ) => [...base, "hr", orgId, userId, accessVersion, "leavesMyRequests", "pages"] as const,
    leaveAnalytics: (year: number) =>
      [...base, "hr", "leaveAnalytics", year] as const,
    headcount: (groupBy: string) =>
      [...base, "hr", "headcount", groupBy] as const,
    directory: () => [...base, "hr", "directory"] as const,
    onboardingAll: [...base, "hr", "onboarding"] as const,
    onboardingStatus: () => [...base, "hr", "onboarding", "status"] as const,
    onboardingUser: (userId: string) =>
      [...base, "hr", "onboarding", "user", userId] as const,
    onboardingTemplates: () =>
      [...base, "hr", "onboarding", "templates"] as const,
    onboardingTemplateDepartments: () =>
      [...base, "hr", "onboarding", "templates", "departments"] as const,
    atsKanban: () => [...base, "hr", "atsKanban"] as const,
    interviewSlas: () => [...base, "hr", "interviewSlas"] as const,
    slaReport: () => [...base, "hr", "slaReport"] as const,
    hiringFlows: () => [...base, "hr", "hiringFlows"] as const,
    /**
     * The reusable job-template library. `params === undefined` yields the bare
     * prefix so a write can invalidate every filtered page at once — a key that
     * always carried its filters would leave the unfiltered picker stale.
     *
     * Named `jobTemplates`, not `hrTemplates`: that segment already belongs to
     * the HR document-template domain, and sharing it would make one domain's
     * invalidation silently refetch the other's.
     */
    jobTemplates: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "jobTemplates"] as const)
        : ([...base, "hr", "jobTemplates", params] as const),
    hiringFlow: (hiringFlowId: number) =>
      [...base, "hr", "hiringFlow", hiringFlowId] as const,
    hiringFlowRounds: (flowId: number) =>
      [...base, "hr", "hiringFlowRounds", flowId] as const,
    emailSequences: () => [...base, "hr", "emailSequences"] as const,
    emailSequence: (emailSequenceId: number) =>
      [...base, "hr", "emailSequence", emailSequenceId] as const,
    emailSequenceMetrics: (emailSequenceId: number) =>
      [...base, "hr", "emailSequence", emailSequenceId, "metrics"] as const,
    /** Conversion over a window, keyed by the window so two ranges do not share a cache entry. */
    recruitingAnalytics: (from: string, to: string) =>
      [...base, "hr", "recruitingAnalytics", from, to] as const,
    candidateVoiceScreens: (candidateId: number) =>
      [...base, "hr", "candidate", candidateId, "voiceScreens"] as const,
    candidateIdentity: (candidateId: number) =>
      [...base, "hr", "recruitment", "candidates", candidateId, "identity"] as const,
    candidateWhatsapp: (candidateId: number) =>
      [...base, "hr", "candidate", candidateId, "whatsapp"] as const,
    pipelineAutomations: () => [...base, "hr", "pipelineAutomations"] as const,
    referrals: () => [...base, "hr", "referrals"] as const,
    talentPools: () => [...base, "hr", "talentPools"] as const,
    offerTemplates: () => [...base, "hr", "offerTemplates"] as const,
    scorecardAnalytics: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "scorecardAnalytics"] as const)
        : ([...base, "hr", "scorecardAnalytics", params] as const),
    headcountRequests: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "headcountRequests"] as const)
        : ([...base, "hr", "headcountRequests", params] as const),
    recruitmentVendors: () => [...base, "hr", "recruitmentVendors"] as const,
    vendorSubmissions: (vendorId: number) =>
      [...base, "hr", "vendorSubmissions", vendorId] as const,
    externalReferrals: () => [...base, "hr", "externalReferrals"] as const,
    externalReferrers: () => [...base, "hr", "externalReferrers"] as const,
    candidateMessages: (candidateId?: number) =>
      candidateId === undefined
        ? ([...base, "hr", "candidateMessages"] as const)
        : ([...base, "hr", "candidateMessages", candidateId] as const),
    messageThreads: () => [...base, "hr", "messageThreads"] as const,
    recruiters: () => [...base, "hr", "recruiters"] as const,
    recruiterActivity: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "recruiterActivity"] as const)
        : ([...base, "hr", "recruiterActivity", params] as const),
    scheduledReports: () => [...base, "hr", "scheduledReports"] as const,
    kpis: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "kpis"] as const)
        : ([...base, "hr", "kpis", params] as const),
    competencyFrameworks: () =>
      [...base, "hr", "competencyFrameworks"] as const,
    feedbackCycles: () => [...base, "hr", "feedbackCycles"] as const,
    feedbackCycle: (feedbackCycleId: number) =>
      [...base, "hr", "feedbackCycle", feedbackCycleId] as const,
    myPendingReviews: () => [...base, "hr", "myPendingReviews"] as const,
    feedbackResults: (subjectId: string) =>
      [...base, "hr", "feedbackResults", subjectId] as const,
    hrTemplates: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "templates"] as const)
        : ([...base, "hr", "templates", params] as const),
    hrTemplate: (hrTemplateId: number) =>
      [...base, "hr", "template", hrTemplateId] as const,
    hrTemplateRenders: (templateId: number) =>
      [...base, "hr", "template", templateId, "renders"] as const,
    hrTemplateVariables: () => [...base, "hr", "templateVariables"] as const,
    employeeEmployment: (userId: string) =>
      [...base, "hr", "employeeEmployment", userId] as const,
    reportingLinesAll: () => [...base, "hr", "reportingLine"] as const,
    reportingLine: (userId: string) =>
      [...base, "hr", "reportingLine", userId] as const,
    managerCoverage: () => [...base, "hr", "reportingLines", "coverage"] as const,
    reportingManagerPolicy: () => [...base, "hr", "reportingManagerPolicy"] as const,
    managerCandidates: (q: string, excludeUserId?: string) =>
      excludeUserId === undefined
        ? ([...base, "hr", "reportingLines", "managerCandidates", q] as const)
        : ([...base, "hr", "reportingLines", "managerCandidates", q, excludeUserId] as const),
    reportingManagerRequests: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "reportingManagerRequests"] as const)
        : ([...base, "hr", "reportingManagerRequests", params] as const),
    reportingManagerRequest: (requestId: string) =>
      [...base, "hr", "reportingManagerRequest", requestId] as const,
    reportingLineBulkJobs: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "reportingLines", "bulkJobs"] as const)
        : ([...base, "hr", "reportingLines", "bulkJobs", params] as const),
    reportingLineBulkJob: (jobId: string, rowCursor?: string) =>
      rowCursor === undefined
        ? ([...base, "hr", "reportingLines", "bulkJob", jobId] as const)
        : ([...base, "hr", "reportingLines", "bulkJob", jobId, rowCursor] as const),
    myReportingLine: () => [...base, "me", "reportingLine"] as const,
    myReportingManagerRequests: () => [...base, "me", "reportingManagerRequests"] as const,
    myManagerCandidates: (q: string) => [...base, "me", "reportingManagerRequests", "managerCandidates", q] as const,
    myApprovers: () => [...base, "me", "approvers"] as const,
    myApprover: (kind: string) => [...base, "me", "approvers", kind] as const,
    myTeam: () => [...base, "me", "team"] as const,
    employeeTimeline: (employmentId: number, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "employeeTimeline", employmentId] as const)
        : ([...base, "hr", "employeeTimeline", employmentId, params] as const),
    employeeSensitive: (employmentId: number) =>
      [...base, "hr", "employeeSensitive", employmentId] as const,
    orgRoles: () => [...base, "hr", "org", "roles"] as const,
    orgLevels: () => [...base, "hr", "org", "levels"] as const,
    workAuthorizations: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "global", "workAuthorizations"] as const)
        : ([...base, "hr", "global", "workAuthorizations", params] as const),
    workAuthorization: (workAuthorizationId: number) =>
      [...base, "hr", "global", "workAuthorization", workAuthorizationId] as const,
    complianceRequirements: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "global", "complianceRequirements"] as const)
        : ([...base, "hr", "global", "complianceRequirements", params] as const),
    complianceRequirement: (complianceRequirementId: number) =>
      [
        ...base,
        "hr",
        "global",
        "complianceRequirement",
        complianceRequirementId,
      ] as const,
    complianceEvents: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "global", "complianceEvents"] as const)
        : ([...base, "hr", "global", "complianceEvents", params] as const),
    contracts: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "global", "contracts"] as const)
        : ([...base, "hr", "global", "contracts", params] as const),
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
    leavePolicyTemplates: () => [...base, "hr", "leave-policy-templates"] as const,
    leavePolicy: () => [...base, "hr", "leave-policy"] as const,
    requisitions: (status?: string) =>
      status === undefined
        ? ([...base, "hr", "requisitions"] as const)
        : ([...base, "hr", "requisitions", status] as const),
    salaryStructureTemplates: () =>
      [...base, "hr", "salary-structure-templates"] as const,
    settingsHubRules: (params: QueryKeyParams | null) =>
      [...base, "hr", "settings-hub", "effective-rules", params] as const,
    settingsHubVersionsAll: [...base, "hr", "settings-hub", "versions"] as const,
    settingsHubVersions: (entity: string, entityId: number | null) =>
      [...base, "hr", "settings-hub", "versions", entity, entityId] as const,
    holidays: () => [...base, "hr", "holidays"] as const,
    importJobs: (entity?: string) =>
      entity === undefined
        ? ([...base, "hr", "import", "jobs"] as const)
        : ([...base, "hr", "import", "jobs", entity] as const),
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
    benefitsAll: [...base, "hr", "benefits"] as const,
    benefitPlans: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "benefits", "plans"] as const)
        : ([...base, "hr", "benefits", "plans", params] as const),
    benefitWindows: [...base, "hr", "benefits", "windows"] as const,
    benefitMy: [...base, "hr", "benefits", "my"] as const,
    benefitDependents: [...base, "hr", "benefits", "dependents"] as const,
    benefitClaims: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "benefits", "claims"] as const)
        : ([...base, "hr", "benefits", "claims", params] as const),
    internshipCertificate: (contractId: number) =>
      [...base, "hr", "global", "contracts", contractId, "certificate"] as const,
    hrPoliciesAll: [...base, "hr", "policies"] as const,
    hrPoliciesList: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "policies", "list"] as const)
        : ([...base, "hr", "policies", "list", params] as const),
    hrPolicyDetail: (hrPolicyId: number) =>
      [...base, "hr", "policies", "detail", hrPolicyId] as const,
    hrFormsAll: [...base, "hr", "forms"] as const,
    hrCasesAll: [...base, "hr", "cases"] as const,
    hrAccessRequests: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr", "access-requests"] as const)
        : ([...base, "hr", "access-requests", params] as const),
    hrLaborAgreementsExpiring: (days: number) =>
      [...base, "hr", "governance", "labor", "agreements", "expiring", days] as const,
    hrDelegationsAll: [...base, "hr", "governance", "delegations"] as const,
    hrLaborMembershipsAll: [...base, "hr", "governance", "labor", "memberships"] as const,
    hrLaborAgreementsAll: [...base, "hr", "governance", "labor", "agreements"] as const,
    hrLaborCasesAll: [...base, "hr", "governance", "labor", "cases"] as const,
    hrLegalHoldsBase: [...base, "hr", "governance", "legal-holds"] as const,
    hrPositionsAll: [...base, "hr", "governance", "positions"] as const,
    hrScenariosAll: [...base, "hr", "governance", "scenarios"] as const,
    hrRetentionPoliciesAll: [...base, "hr", "governance", "retention", "policies"] as const,
    hrRetentionRequestsAll: [...base, "hr", "governance", "retention", "requests"] as const,
    hrWorkflowsAll: [...base, "hr", "workflows"] as const,
    hrWorkflowInstancesAll: [...base, "hr", "workflow-instances"] as const,
    hrWorkflowDelegationsAll: [...base, "hr", "workflow-delegations"] as const,
    hrRecognition: [...base, "hr", "recognition"] as const,
    hrLettersAll: [...base, "hr", "letters"] as const,
    hrTalentPoolMembersAll: (poolId: number) =>
      [...base, "hr", "talentPools", poolId, "members"] as const,
    hrInternalJobs: [...base, "hr", "recruitment", "internal-jobs"] as const,
    internalMyApplications: [...base, "hr", "recruitment", "internal-mobility", "mine"] as const,
    internalApprovals: [...base, "hr", "recruitment", "internal-mobility", "approvals"] as const,
    internalApprovalDecision: [...base, "hr", "recruitment", "internal-mobility", "decide"] as const,
    atsSandboxEvents: [...base, "hr", "recruitment", "developer", "events"] as const,
    atsDirectorySync: [...base, "hr", "recruitment", "developer", "directory-sync"] as const,
    atsSandboxDeliveries: [...base, "hr", "recruitment", "developer", "deliveries"] as const,
    atsSandboxReplay: [...base, "hr", "recruitment", "developer", "replay"] as const,
    hrAssignedInterviews: (page: number) =>
      [...base, "hr", "me", "assigned-interviews", page] as const,
    hrDevicesAll: [...base, "hr", "enterprise", "comp", "devices"] as const,
    hrEnterpriseSyncLogsAll: [...base, "hr", "enterprise", "comp", "syncLogs"] as const,
    hrEnterpriseCompCyclesAll: [...base, "hr", "enterprise", "comp", "cycles"] as const,
    hrEnterpriseCompRecsAll: [...base, "hr", "enterprise", "comp", "recommendations"] as const,
    hrEnterpriseCompBudgetAll: [...base, "hr", "enterprise", "comp", "budgetPools"] as const,
    hrEnterpriseEquityGrantsAll: [...base, "hr", "enterprise", "comp", "equityGrants"] as const,
    hrEnterpriseCostingAll: [...base, "hr", "enterprise", "comp", "costing"] as const,
    hrIdentityAll: [...base, "hr-identity"] as const,
    emailTemplatesList: () => [...base, "hr", "email-templates", "list"] as const,
    fnfList: () => [...base, "hr", "fnf", "list"] as const,
    assetReturnsList: () => [...base, "hr", "asset-returns", "list"] as const,
  },
} as const;
