import { z } from "zod";


export const aiCreditTransactionTypeContract = z.enum([
  "PURCHASE",
  "USAGE",
  "REFUND",
  "PLAN_GRANT",
  "EXPIRY",
]);

export const aiCreditPackContract = z.object({
  id: z.number(),
  name: z.string(),
  credits: z.number(),
  bonusCredits: z.number(),
  priceInPaise: z.number(),
  isActive: z.boolean(),
});

export const aiCreditTransactionContract = z.object({
  id: z.number(),
  type: aiCreditTransactionTypeContract,
  amount: z.number(),
  balanceAfter: z.number(),
  feature: z.string().nullable(),
  model: z.string().nullable(),
  promptTokens: z.number().nullable(),
  completionTokens: z.number().nullable(),
  totalTokens: z.number().nullable(),
  costUsd: z.string().nullable(),
  createdAt: z.string(),
});

export const aiCreditsWalletContract = z.object({
  wallet: z.object({
    id: z.number(),
    orgId: z.string(),
    balance: z.number(),
    lifetimeGranted: z.number(),
    lifetimeConsumed: z.number(),
    autoTopUpEnabled: z.boolean(),
    autoTopUpPackId: z.number().nullable(),
    autoTopUpThreshold: z.number().nullable(),
  }),
  recentTransactions: z.array(aiCreditTransactionContract),
  packs: z.array(aiCreditPackContract),
});

export const aiCreditTransactionsPageContract = z.object({
  data: z.array(aiCreditTransactionContract),
  pagination: z.object({
    limit: z.number(),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export const aiCreditsUsageTotalsContract = z.object({
  requests: z.number(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  credits: z.number(),
  costUsd: z.number(),
});

export const aiCreditsUsageByFeatureContract = z.object({
  feature: z.string(),
  requests: z.number(),
  totalTokens: z.number(),
  credits: z.number(),
  costUsd: z.number(),
});

export const aiCreditsUsageByModelContract = z.object({
  model: z.string(),
  requests: z.number(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  credits: z.number(),
  costUsd: z.number(),
});

export const aiCreditsUsageDailyContract = z.object({
  date: z.string(),
  requests: z.number(),
  totalTokens: z.number(),
  credits: z.number(),
});

export const aiCreditsUsageContract = z.object({
  totals: aiCreditsUsageTotalsContract,
  byFeature: z.array(aiCreditsUsageByFeatureContract),
  byModel: z.array(aiCreditsUsageByModelContract),
  daily: z.array(aiCreditsUsageDailyContract),
});

export const autoTopUpResponseContract = z.object({
  id: z.number(),
  orgId: z.string(),
  balance: z.number(),
  autoTopUpEnabled: z.boolean(),
  autoTopUpPackId: z.number().nullable(),
  autoTopUpThreshold: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const purchaseAiCreditsContract = z.union([
  z.object({
    orderId: z.string(),
    amount: z.number(),
    currency: z.string(),
    keyId: z.string(),
    pack: aiCreditPackContract,
  }),
  z.object({
    balance: z.number(),
    creditsAdded: z.number(),
    pack: aiCreditPackContract,
  }),
]);

export type AiCreditPack = z.infer<typeof aiCreditPackContract>;
export type AiCreditTransaction = z.infer<typeof aiCreditTransactionContract>;
export type AiCreditsWallet = z.infer<typeof aiCreditsWalletContract>;
export type AiCreditTransactionsPage = z.infer<
  typeof aiCreditTransactionsPageContract
>;
export type AiCreditsUsageByFeature = z.infer<
  typeof aiCreditsUsageByFeatureContract
>;
export type AiCreditsUsageByModel = z.infer<typeof aiCreditsUsageByModelContract>;
export type AiCreditsUsageDaily = z.infer<typeof aiCreditsUsageDailyContract>;
export type AiCreditsUsage = z.infer<typeof aiCreditsUsageContract>;
