import { z } from "zod";

export const explainInsightInvContract = z.object({
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

export const reorderProposalInvContract = z.object({
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

export const supplierDelayBriefingInvContract = z.object({
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

export const digestInvContract = z.object({
  summary: z.string(),
  insights: z.array(z.object({
    id: z.number().int(),
    insightType: z.string(),
    title: z.string(),
    description: z.string(),
    severity: z.string(),
    status: z.string(),
  })),
  aiUsage: z.object({
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    totalTokens: z.number().int(),
    creditsCharged: z.number(),
  }).optional(),
});
