import { queryKeyBase as base } from "./base";
import { trimKey } from "./base";

export const inventoryAiReviewQueryKeys = {
  inventoryAiReview: {
    all: [...base, "inventory", "ai-review"] as const,
    anomalies: (params?: object) =>
      trimKey(...base, "inventory", "ai-review", "anomalies", params),
    review: [...base, "inventory", "ai-review", "anomalies", "review"] as const,
    demandRisk: [...base, "inventory", "ai-review", "demand-risk"] as const,
    feedback: [...base, "inventory", "ai-review", "feedback"] as const,
    feedbackSummary: (params?: object) =>
      trimKey(...base, "inventory", "ai-review", "feedback", "summary", params),
  },
} as const;
