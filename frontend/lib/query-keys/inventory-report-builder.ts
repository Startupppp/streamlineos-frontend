import { queryKeyBase as base } from "./base";

/**
 * F5 — the natural-language report builder.
 *
 * Its own namespace rather than three more entries on `inventoryQueryKeys`, for
 * the reason `inventory-copilot.ts` beside it already gives: that object is
 * under concurrent edit and this is purely additive, and the registry merges the
 * domain objects with a **shallow** spread, so a second file declaring an
 * `inventory` key would replace the first wholesale.
 *
 * `catalog` is a real query — static, identical for every caller, no provider
 * call and no credits, which is what makes it safe on a page render. `ask` and
 * `export` are mutation keys: asking spends credits and exporting produces a
 * file, so both only ever happen because somebody pressed something.
 */
export const inventoryReportBuilderQueryKeys = {
  inventoryReportBuilder: {
    all: [...base, "inventory", "reportBuilder"] as const,
    catalog: () => [...base, "inventory", "reportBuilder", "catalog"] as const,
    ask: [...base, "inventory", "reportBuilder", "ask"] as const,
    export: [...base, "inventory", "reportBuilder", "export"] as const,
  },
} as const;
