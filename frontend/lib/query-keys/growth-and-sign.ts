import { queryKeyBase as base } from "./base";

export const growthAndSignQueryKeys = {
  feedbucket: {
    all: [...base, "feedbucket"] as const,
    widgets: () => [...base, "feedbucket", "widgets"] as const,
    widget: (widgetId: number) =>
      [...base, "feedbucket", "widgets", widgetId] as const,
    submissions: (params?: Record<string, unknown>) =>
      [...base, "feedbucket", "submissions", params] as const,
    submission: (submissionId: number) =>
      [...base, "feedbucket", "submissions", submissionId] as const,
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
    detail: (campaignId: number) =>
      [...base, "crmCampaigns", "detail", campaignId] as const,
    roi: (campaignId: number) =>
      [...base, "crmCampaigns", "roi", campaignId] as const,
    leads: (campaignId: number, params?: Record<string, unknown>) =>
      [...base, "crmCampaigns", "leads", campaignId, params] as const,
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

  crmCommission: {
    all: [...base, "crmCommission"] as const,
    plans: () => [...base, "crmCommission", "plans"] as const,
    plan: (planId: string) => [...base, "crmCommission", "plan", planId] as const,
    versionInForce: (planId: string, on: string) =>
      [...base, "crmCommission", "plan", planId, "version-in-force", on] as const,
    earnings: (params?: Record<string, unknown>) =>
      [...base, "crmCommission", "earnings", params] as const,
    /** The period accrual and its decomposition are one cache entry per period. */
    accrual: (params?: Record<string, unknown>) =>
      [...base, "crmCommission", "accrual", params] as const,
    accrualCurve: (params?: Record<string, unknown>) =>
      [...base, "crmCommission", "accrual", "curve", params] as const,
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

} as const;
