import type {
  InvReportCatalog,
  InvReportCatalogEntry,
  InvReportPreview,
} from "@/hooks/api/inventory/report-builder";

/**
 * Fixtures for the inventory report builder's screen tests.
 *
 * Split out of the spec rather than inlined: the assertions are about how the
 * screen reads a response, and sixty lines of response shape between them makes
 * that harder to see, not easier. `preview()` defaults to the honest case, so
 * each test states only the one field it is about.
 */

export const PREVIEW_COLUMNS = [
  { key: "lotNumber", label: "Lot", numeric: false },
  { key: "expiryDate", label: "Expires", numeric: false },
  { key: "totalOnHand", label: "On hand", numeric: true },
];

export const SKU_COLUMN = { key: "variantSku", label: "SKU", numeric: false };

function entry(
  id: InvReportCatalogEntry["id"],
  label: string,
  description: string,
  viewPermission: string,
  takesWarehouse: boolean,
  columns: InvReportCatalogEntry["columns"] = [SKU_COLUMN],
): InvReportCatalogEntry {
  return {
    id,
    label,
    description,
    viewPermission,
    exportPermission: id === "movements" ? "inventory:audit:export" : "inventory:export",
    takesWarehouse,
    columns,
  };
}

const REPORTS_READ = "inventory:reports:read";

/** The six the controller's catalogue route returns, in its order. */
export const CATALOG: InvReportCatalog = {
  prompt: "- stock_summary: …",
  reports: [
    entry("stock_summary", "Stock summary", "Current on-hand per SKU per location.", REPORTS_READ, false),
    entry("reorder", "Reorder report", "SKUs at or below their reorder point.", REPORTS_READ, false),
    entry("movements", "Stock movements", "Ledger entries with the balance after.", REPORTS_READ, true),
    entry("slow_moving", "Slow-moving stock", "Stock on hand with no outbound movement.", REPORTS_READ, false),
    entry("expiry", "Expiring lots", "Lots whose expiry falls inside a horizon.", REPORTS_READ, true, PREVIEW_COLUMNS),
    entry("valuation", "Inventory valuation", "The value of stock on hand per SKU.", "inventory:valuation:read", true),
  ],
};

export function preview(overrides: Partial<InvReportPreview>): InvReportPreview {
  return {
    status: "ok",
    question: "which lots expire soon",
    spec: { report: "expiry", filters: { withinDays: 30 } },
    label: "Expiring lots",
    plannedBy: "model",
    columns: PREVIEW_COLUMNS,
    rows: [{ lotNumber: "LOT-44", expiryDate: "2026-10-01", totalOnHand: 120 }],
    rowCount: 1,
    total: 1,
    truncated: false,
    stripped: [],
    requiredPermission: null,
    canExport: true,
    provenance: {
      contractVersion: 1,
      promptKey: "inv.report-builder",
      promptVersion: 1,
      model: "claude-fast",
      correlationId: "corr-1",
    },
    aiUsage: {
      model: "claude-fast",
      promptTokens: 300,
      completionTokens: 40,
      totalTokens: 340,
      credits: 0.4,
      costUsd: 0.002,
    },
    generatedAt: "2026-09-10T09:00:00.000Z",
    ...overrides,
  };
}
