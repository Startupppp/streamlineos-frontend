import { z } from "zod";

const insightContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  insightType: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.string(),
  status: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
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

export const explainInsightContract = z.object({
  insightId: z.number().int(),
  explanation: z.string(),
  recommendations: z.array(z.string()),
  aiUsage: z.object({
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    totalTokens: z.number().int(),
    creditsCharged: z.number(),
  }).optional(),
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
  proposals: z.array(z.object({
    variantId: z.number().int(),
    variantSku: z.string(),
    variantName: z.string(),
    productName: z.string(),
    currentStock: z.number(),
    suggestedOrderQty: z.number(),
    suggestedVendorId: z.number().int().nullable(),
    reason: z.string(),
  })),
  aiUsage: z.object({
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    totalTokens: z.number().int(),
    creditsCharged: z.number(),
  }).optional(),
});

export const supplierDelayBriefingContract = z.object({
  briefing: z.string(),
  affectedOrders: z.array(z.object({
    poId: z.number().int(),
    poNumber: z.string(),
    vendorName: z.string(),
    expectedDeliveryDate: z.string().nullable(),
    items: z.array(z.object({
      variantSku: z.string(),
      quantity: z.string(),
    })),
  })),
  aiUsage: z.object({
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    totalTokens: z.number().int(),
    creditsCharged: z.number(),
  }).optional(),
});
