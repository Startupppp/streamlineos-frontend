import { queryKeyBase as base, type QueryKeyParams } from "./base";

export const growthAndSignQueryKeys = {
  feedbucket: {
    all: [...base, "feedbucket"] as const,
    widgets: () => [...base, "feedbucket", "widgets"] as const,
    widget: (widgetId: number) =>
      [...base, "feedbucket", "widgets", widgetId] as const,
    submissions: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "feedbucket", "submissions"] as const)
        : ([...base, "feedbucket", "submissions", params] as const),
    submission: (submissionId: number) =>
      [...base, "feedbucket", "submissions", submissionId] as const,
  },

  crmMetadata: {
    all: [...base, "crmMetadata"] as const,
    detail: () => [...base, "crmMetadata", "detail"] as const,
    options: (type: string) =>
      [...base, "crmMetadata", "options", type] as const,
    validationRules: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "crmMetadata", "validationRules"] as const)
        : ([...base, "crmMetadata", "validationRules", params] as const),
    blueprints: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "crmMetadata", "blueprints"] as const)
        : ([...base, "crmMetadata", "blueprints", params] as const),
    blueprintTransitions: (blueprintId: string | null) =>
      [...base, "crmMetadata", "blueprints", blueprintId, "transitions"] as const,
  },

  crmCampaigns: {
    all: [...base, "crmCampaigns"] as const,
    list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "crmCampaigns", "list"] as const)
        : ([...base, "crmCampaigns", "list", params] as const),
    detail: (campaignId: number) =>
      [...base, "crmCampaigns", "detail", campaignId] as const,
    roi: (campaignId: number) =>
      [...base, "crmCampaigns", "roi", campaignId] as const,
    leads: (campaignId: number, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "crmCampaigns", "leads", campaignId] as const)
        : ([...base, "crmCampaigns", "leads", campaignId, params] as const),
    /** Half-life is part of the answer for time_decay, so it is part of the key. */
    attributionByModel: (model: string, halfLifeDays: number) =>
      [...base, "crmCampaigns", "attributionByModel", model, halfLifeDays] as const,
    attribution: (model: string) =>
      [...base, "crmCampaigns", "attribution", model] as const,
  },

  crmAutomations: {
    all: [...base, "crmAutomations"] as const,
    list: () => [...base, "crmAutomations", "list"] as const,
    events: () => [...base, "crmAutomations", "events"] as const,
    actions: () => [...base, "crmAutomations", "actions"] as const,
    runs: (ruleId: number, cursor?: string) =>
      cursor === undefined
        ? ([...base, "crmAutomations", "runs", ruleId] as const)
        : ([...base, "crmAutomations", "runs", ruleId, cursor] as const),
  },

  crmSequences: {
    all: [...base, "crmSequences"] as const,
    list: () => [...base, "crmSequences", "list"] as const,
    steps: (sequenceId: string) =>
      [...base, "crmSequences", "steps", sequenceId] as const,
    enrollments: (sequenceId: string, cursor?: string) =>
      cursor === undefined
        ? ([...base, "crmSequences", "enrollments", sequenceId] as const)
        : ([...base, "crmSequences", "enrollments", sequenceId, cursor] as const),
  },

  crmCommission: {
    all: [...base, "crmCommission"] as const,
    plans: () => [...base, "crmCommission", "plans"] as const,
    plan: (planId: string) => [...base, "crmCommission", "plan", planId] as const,
    earnings: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "crmCommission", "earnings"] as const)
        : ([...base, "crmCommission", "earnings", params] as const),
    /** The period accrual and its decomposition are one cache entry per period. */
    accrual: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "crmCommission", "accrual"] as const)
        : ([...base, "crmCommission", "accrual", params] as const),
    accrualByDeal: (dealId: string) =>
      [...base, "crmCommission", "accrual", "by-deal", dealId] as const,
    earningBreakdown: (earningId: string) =>
      [...base, "crmCommission", "accrual", "earning", earningId] as const,
  },

  crmCallIntelligence: {
    all: [...base, "crmCallIntelligence"] as const,
    /** Keyed by activity: one analysis belongs to one call, never to a list. */
    analysis: (activityId: string) =>
      [...base, "crmCallIntelligence", "analysis", activityId] as const,
    coaching: (sinceDays: number) =>
      [...base, "crmCallIntelligence", "coaching", sinceDays] as const,
    /**
     * Per-rep metrics and the best-call search, keyed by every parameter that
     * changes the answer.
     *
     * The window is in the key and so is the page, because these are aggregates
     * over a period: a 7-day summary cached under a 30-day key would show a
     * manager last week's numbers under this month's heading. The scope is NOT
     * in the key and does not need to be — `scopedQueryKeyHashFn` already hashes
     * every key under `authenticated:<orgId>:<userId>`, so one person's own-scope
     * rows can never be served to another person's team-scope read.
     */
    reps: (params: Record<string, unknown>) =>
      [...base, "crmCallIntelligence", "reps", params] as const,
    exemplars: (params: Record<string, unknown>) =>
      [...base, "crmCallIntelligence", "exemplars", params] as const,
  },

  crmInbox: {
    all: [...base, "crmInbox"] as const,
    data: () => [...base, "crmInbox", "data"] as const,
    counts: () => [...base, "crmInbox", "counts"] as const,
  },

  signEnvelopes: {
    all: [...base, "signEnvelopes"] as const,
    list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "signEnvelopes", "list"] as const)
        : ([...base, "signEnvelopes", "list", params] as const),
    detail: (envelopeId: number) =>
      [...base, "signEnvelopes", "detail", envelopeId] as const,
    audit: (envelopeId: number) =>
      [...base, "signEnvelopes", "audit", envelopeId] as const,
    certificate: (envelopeId: number) =>
      [...base, "signEnvelopes", "certificate", envelopeId] as const,
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
    detail: (templateId: number) =>
      [...base, "signTemplates", "detail", templateId] as const,
  },

  signBulkSend: {
    all: [...base, "signBulkSend"] as const,
    job: (bulkSendJobId: number) =>
      [...base, "signBulkSend", "job", bulkSendJobId] as const,
    errorReport: (bulkSendJobId: number) =>
      [...base, "signBulkSend", "job", bulkSendJobId, "errorReport"] as const,
  },

  signAdmin: {
    settings: () => [...base, "signAdmin", "settings"] as const,
    watermarkPolicies: () =>
      [...base, "signAdmin", "watermarkPolicies"] as const,
    sweepStatus: () => [...base, "signAdmin", "sweepStatus"] as const,
  },

  signPublic: {
    session: (token: string) =>
      [...base, "signPublic", "session", token] as const,
    form: (slug: string) => [...base, "signPublic", "form", slug] as const,
  },

  billing: {
    all: [...base, "billing"] as const,
    aiCredits: () => [...base, "billing", "ai-credits"] as const,
    aiCreditTransactions: (params: QueryKeyParams) =>
      [...base, "billing", "ai-credits", "transactions", params] as const,
    aiCreditsUsage: (days: number) =>
      [...base, "billing", "ai-credits", "usage", { days }] as const,
    entitlements: () => [...base, "billing", "entitlements"] as const,
    subscription: () => [...base, "billing", "subscription"] as const,
    summary: () => [...base, "billing", "summary"] as const,
    plans: () => [...base, "billing", "plans"] as const,
    coupon: (code: string, plan: string | null, billingCycle?: string) =>
      billingCycle !== undefined
        ? ([...base, "billing", "coupon", code, plan, billingCycle] as const)
        : ([...base, "billing", "coupon", code, plan] as const),
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

} as const;
