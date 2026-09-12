import { queryKeyBase as base } from "./base";
import { trimKey } from "./base";

/**
 * F3/F6 — the anomaly queue, the demand-risk narrative and AI feedback.
 *
 * A namespace of its own rather than three more entries on
 * `inventoryQueryKeys`, for the reason `inventory-copilot.ts` already gives:
 * that object is under concurrent edit and this is purely additive. The registry
 * merges the domain objects with a **shallow** spread, so a second file
 * declaring an `inventory` key would replace the first wholesale — which is why
 * this reads `queryKeys.inventoryAiReview.*`.
 *
 * `anomalies` takes its filters, because the queue is warehouse-scoped and
 * status-filtered: a key that omitted them would serve one operator's page to
 * the next filter, which is the same defect the cache rules warn about on the
 * server.
 *
 * `demandRisk` and `feedback` are **mutation** keys. Both spend or record
 * against a paid call, so neither may ever load with a page.
 */
export const inventoryAiReviewQueryKeys = {
  inventoryAiReview: {
    all: [...base, "inventory", "ai-review"] as const,
    anomalies: (params?: object) =>
      trimKey(...base, "inventory", "ai-review", "anomalies", params),
    review: [...base, "inventory", "ai-review", "anomalies", "review"] as const,
    demandRisk: [...base, "inventory", "ai-review", "demand-risk"] as const,
    feedback: [...base, "inventory", "ai-review", "feedback"] as const,
    /**
     * Restored: `useInventoryAiFeedbackSummary` (`hooks/api/inventory/ai-review.ts`)
     * reads this and `useSubmitInventoryAiFeedback` invalidates it. It was deleted
     * as a leaf with no reader in the same second a sibling sweep deleted both, so
     * each deletion looked justified by the other.
     */
    feedbackSummary: (params?: object) =>
      trimKey(...base, "inventory", "ai-review", "feedback", "summary", params),
  },
} as const;
