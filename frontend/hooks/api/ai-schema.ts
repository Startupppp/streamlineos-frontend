import { z } from "zod";

const wireDate = () => z.string();
const nullableWireDate = () => z.string().nullable();

const leadScoreSchema = z.object({
  score: z.number(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
  reasoning: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestedActions: z.array(z.string()),
});

export const scoreLeadSingleContract = leadScoreSchema;

export const scoreLeadBatchContract = z.object({
  results: z.record(z.string(), leadScoreSchema),
  scored: z.number().int(),
});

export const generateEmailContract = z.object({
  subject: z.string(),
  body: z.string(),
});

export const predictDealContract = z.object({
  winProbability: z.number(),
  estimateDisclaimer: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  reasoning: z.string(),
  riskFactors: z.array(z.string()),
  positiveSignals: z.array(z.string()),
  recommendedActions: z.array(z.string()),
});

export const nextActionContract = z.object({
  action: z.string(),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  reasoning: z.string(),
  template: z.string(),
});

export const enrichLeadContract = z.object({
  companyInsight: z.string(),
  estimatedCompanySize: z.string(),
  industry: z.string(),
  talkingPoints: z.array(z.string()),
  potentialNeeds: z.array(z.string()),
  recommendedApproach: z.string(),
});

const candidateScoreBaseSchema = z.object({
  score: z.number(),
  fitLevel: z.enum(["excellent", "good", "average", "poor"]),
  reasoning: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  suggestedQuestions: z.array(z.string()),
});

export const scoreCandidateContract = candidateScoreBaseSchema.extend({
  advisory: z.literal(true),
  disclaimer: z.string(),
});

const reviewDraftBaseSchema = z.object({
  overallRating: z.number(),
  strengths: z.string(),
  improvements: z.string(),
  comments: z.string(),
  ratings: z.array(z.object({ category: z.string(), score: z.number(), comment: z.string() })),
});

export const generateReviewContract = reviewDraftBaseSchema.extend({
  advisory: z.literal(true),
  disclaimer: z.string(),
});

const attritionRiskBaseSchema = z.object({
  attritionRiskScore: z.number(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  reasoning: z.string(),
  riskFactors: z.array(z.string()),
  retentionActions: z.array(z.string()),
});

export const attritionRiskContract = attritionRiskBaseSchema.extend({
  advisory: z.literal(true),
  disclaimer: z.string(),
});

const nlSearchLeadSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().nullable(),
  company: z.string().nullable(),
  status: z.string(),
  priority: z.string().nullable(),
  source: z.string().nullable(),
  value: z.number().nullable(),
  city: z.string().nullable(),
  assignedTo: z.string().nullable(),
});

export const nlSearchContract = z.object({
  query: z.string(),
  parsedFilters: z.object({
    status: z.string().optional(),
    priority: z.string().optional(),
    source: z.string().optional(),
    assignedTo: z.string().optional(),
    city: z.string().optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
  }),
  leads: z.array(nlSearchLeadSchema),
  total: z.number().int(),
});

export const orgFeatureFlagsContract = z.object({
  aiChat: z.boolean(),
  aiLeadScoring: z.boolean(),
  aiEmailDraft: z.boolean(),
  aiSmartNotifications: z.boolean(),
  aiWeeklyRecap: z.boolean(),
  supportAi: z.boolean(),
});

export const updateFeatureFlagContract = z.object({
  success: z.literal(true),
  flag: z.string(),
  enabled: z.boolean(),
});

export const aiUsageContract = z.object({
  totals: z.object({
    totalTokens: z.number(),
    promptTokens: z.number(),
    completionTokens: z.number(),
    estimatedCostUsd: z.string(),
    requestCount: z.number().int(),
  }),
  byFeature: z.array(z.object({
    feature: z.string(),
    model: z.string(),
    totalTokens: z.number(),
    estimatedCostUsd: z.string(),
    requestCount: z.number().int(),
  })),
  daily: z.array(z.object({
    date: z.string(),
    totalTokens: z.number(),
    estimatedCostUsd: z.string(),
    requestCount: z.number().int(),
  })),
  performance: z.object({
    avgLatencyMs: z.number().nullable(),
    p95LatencyMs: z.number().nullable(),
    errorRate: z.number(),
  }),
  acceptance: z.object({
    feedbackByFeature: z.array(z.object({
      feature: z.string(),
      up: z.number().int(),
      down: z.number().int(),
      total: z.number().int(),
      ratio: z.number().nullable(),
    })),
    supportSuggestions: z.object({
      accepted: z.number().int(),
      rejected: z.number().int(),
      pending: z.number().int(),
    }),
  }),
});

const interviewKitRoundSchema = z.object({
  round: z.string(),
  questions: z.array(z.object({
    question: z.string(),
    category: z.string(),
    expectedAnswer: z.string(),
    redFlags: z.array(z.string()),
  })),
  rubric: z.array(z.object({
    criterion: z.string(),
    weight: z.number(),
    description: z.string(),
  })),
});

export const interviewKitContract = z.object({
  roundKits: z.array(interviewKitRoundSchema),
  advisory: z.boolean().optional(),
  disclaimer: z.string().optional(),
});

export const interviewNotesSummaryContract = z.object({
  overallRecommendation: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  strengthsSummary: z.string(),
  concernsSummary: z.string(),
  roundSummaries: z.array(z.object({
    round: z.string(),
    verdict: z.string(),
    keyPoints: z.array(z.string()),
  })),
  suggestedNextStep: z.string(),
  advisory: z.boolean().optional(),
  disclaimer: z.string().optional(),
});

export const acceptCandidateScoreContract = z.object({
  accepted: z.literal(true),
});

export const confirmActionContract = z.object({
  ok: z.literal(true),
  result: z.record(z.string(), z.unknown()),
  summary: z.string(),
});
