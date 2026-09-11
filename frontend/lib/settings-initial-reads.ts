import type { AiCreditsUsageDays } from "@/hooks/api/ai-credits";

// The first request each settings surface makes, named once so its prefetch cannot key differently.
export const ACCOUNT_LOGIN_HISTORY_PARAMS = { page: 1, limit: 5 } as const;

export const SIMULATION_CANDIDATE_PARAMS = { limit: 100 } as const;

export const AI_CREDIT_TRANSACTION_LIMIT = 20;

export const AI_CREDIT_TRANSACTION_PARAMS = {
  cursor: undefined,
  limit: AI_CREDIT_TRANSACTION_LIMIT,
} as const;

export const AI_CREDITS_USAGE_DAYS: AiCreditsUsageDays = 30;
