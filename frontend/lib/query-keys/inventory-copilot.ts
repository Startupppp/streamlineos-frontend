import { queryKeyBase as base } from "./base";

/**
 * F2 — the inventory copilot.
 *
 * A namespace of its own rather than two more entries on `inventoryQueryKeys`,
 * for the reason `inventory-picking.ts` and `inventory-vendor-scorecard.ts`
 * already give: that object is under concurrent edit and this is purely
 * additive. The registry merges the domain objects with a **shallow** spread, so
 * a second file declaring an `inventory` key would replace the first wholesale
 * — which is why this reads `queryKeys.inventoryCopilot.*`.
 *
 * These are mutation keys, not query keys: asking spends credits, so it only
 * ever happens because somebody pressed something, and nothing here may load
 * with a page. They live in the factory anyway so the array is declared once
 * rather than retyped at each call site.
 */
export const inventoryCopilotQueryKeys = {
  inventoryCopilot: {
    all: [...base, "inventory", "copilot"] as const,
    ask: [...base, "inventory", "copilot", "ask"] as const,
  },
} as const;
