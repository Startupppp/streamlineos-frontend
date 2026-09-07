import { z } from "zod";

const insightContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  insightType: z.string(),
  severity: z.string(),
  title: z.string(),
  body: z.string(),
  sourceRefs: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(["NEW", "ACKNOWLEDGED", "DISMISSED"]),
  createdAt: z.string(),
});

export const listInsightsContract = z.object({
  items: z.array(insightContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const generateInsightsContract = z.object({
  generated: z.number().int(),
  insights: z.array(insightContract),
  aiUsage: z.object({
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    totalTokens: z.number().int(),
    creditsCharged: z.number(),
  }).optional(),
});

export const updateInsightStatusContract = insightContract;

const explainFactorContract = z.object({
  label: z.string(),
  value: z.string(),
  isFactual: z.boolean(),
});

export const explainInsightContract = z.object({
  explanation: z.string(),
  factors: z.array(explainFactorContract),
  suggestedActions: z.array(z.string()),
  evidenceSnapshot: z.record(z.string(), z.unknown()),
});

export const digestContract = z.object({
  summary: z.string(),
  insights: z.array(insightContract),
  aiUsage: z.object({
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    totalTokens: z.number().int(),
    creditsCharged: z.number(),
  }).optional(),
});

export const reorderProposalContract = z.object({
  evidence: z.object({
    productVariantId: z.number().int(),
    variantSku: z.string(),
    variantName: z.string(),
    productName: z.string(),
    currentOnHand: z.number(),
    forecastedQty: z.number(),
    suggestedOrderQty: z.number(),
    vendorId: z.number().int().nullable(),
    leadTimeDays: z.number().int(),
    expectedDeliveryDate: z.string(),
    reorderReason: z.string(),
    warehouseId: z.number().int().nullable(),
    warehouseName: z.string().nullable(),
  }),
  explanation: z.object({
    explanation: z.string(),
    factors: z.array(explainFactorContract),
    suggestedActions: z.array(z.string()),
  }),
  proposal: z.object({
    proposalId: z.number().int(),
    token: z.string(),
    expiresAt: z.string(),
  }),
});

const vendorPerformanceContract = z.object({
  vendorId: z.number().int(),
  onTimeRate: z.number(),
  fillRate: z.number(),
  avgLeadTimeDays: z.number(),
  returnRate: z.number(),
  openPoCount: z.number().int(),
  totalSpend: z.string(),
});

const vendorInsightItemContract = z.object({
  id: z.number().int(),
  title: z.string(),
  body: z.string(),
  severity: z.string(),
});

export const supplierDelayBriefingContract = z.object({
  vendors: z.array(z.object({
    vendorId: z.number().int(),
    vendorName: z.string(),
    insightCount: z.number().int(),
    insights: z.array(vendorInsightItemContract),
    performance: vendorPerformanceContract,
  })),
  narration: z.string(),
  generatedAt: z.string(),
});
