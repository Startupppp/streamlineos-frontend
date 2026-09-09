"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { downloadBlob } from "@/lib/download-blob";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";

/* ------------------------------------------------------------------ *
 * F5 — the natural-language report builder
 * ------------------------------------------------------------------ */

/** The six reports a question can resolve to. Mirrors `INV_REPORT_IDS`. */
export type InvReportId =
  | "stock_summary"
  | "reorder"
  | "movements"
  | "slow_moving"
  | "expiry"
  | "valuation";

/**
 * The config the server ran, echoed back to `export` verbatim.
 *
 * The backend's own schema is a six-member discriminated union with a distinct
 * `.strict()` filter shape per report. That union is deliberately **not**
 * restated here, and the reason is the direction of travel: this client never
 * authors a spec. It receives one the server planned, scoped and re-validated,
 * displays which filters ran, and hands the same object back — so a parallel
 * union would buy no safety the server does not already provide on both ends,
 * and would go stale the day `invTxnTypeEnum` gains a member.
 */
export interface InvReportSpec {
  report: InvReportId;
  filters: Readonly<Record<string, string | number>>;
}

export interface InvReportCatalogColumn {
  key: string;
  label: string;
  numeric: boolean;
}

export interface InvReportCatalogEntry {
  id: InvReportId;
  label: string;
  description: string;
  viewPermission: string;
  exportPermission: string;
  takesWarehouse: boolean;
  columns: InvReportCatalogColumn[];
}

export interface InvReportCatalog {
  reports: InvReportCatalogEntry[];
  /** The same text the model is shown. Not rendered; the six labels are. */
  prompt: string;
}

/**
 * A filter the server removed because it named something the asker cannot see.
 *
 * A narrowed report that does not say it was narrowed reads as a complete one,
 * which is the whole reason this field exists on the wire and the whole reason
 * the UI has to render it.
 */
export interface InvReportStrippedFilter {
  field: string;
  reason: string;
}

/**
 * The two answers a preview can be, and they are not two shades of the same one.
 *
 * `ok` is a report that ran. `not_permitted` is the model having chosen a report
 * whose own permission the asker does not hold — valuation is the case that
 * makes it concrete, since it costs `inventory:valuation:read` and the other
 * five do not. It arrives with `requiredPermission` set and must never render as
 * an empty table.
 */
export type InvReportStatus = "ok" | "not_permitted";

export interface InvReportPreview {
  status: InvReportStatus;
  question: string;
  spec: InvReportSpec;
  label: string;
  /**
   * `deterministic` means the model did not answer — the call failed or its
   * output did not validate — and a keyword fallback plan ran instead. The
   * distinction is the difference between an answer and a guess, and the backend
   * went out of its way to report it.
   */
  plannedBy: "model" | "deterministic";
  columns: InvReportCatalogColumn[];
  rows: Array<Record<string, string | number | null>>;
  /** Rows in THIS preview, not rows in the report. `total` is that. */
  rowCount: number;
  total: number | null;
  truncated: boolean;
  stripped: InvReportStrippedFilter[];
  /** Set on `not_permitted`: the key the chosen report costs. */
  requiredPermission: string | null;
  canExport: boolean;
  provenance: {
    contractVersion: number;
    promptKey: string;
    promptVersion: number;
    model: string;
    correlationId: string;
  } | null;
  aiUsage?: AiUsageMeta;
  generatedAt: string;
}

export interface InvReportAskInput {
  question: string;
  warehouseId?: number;
}

/** Matches `INV_REPORT_QUESTION_MAX`; the server rejects anything longer. */
export const INV_REPORT_QUESTION_MAX = 400;
export const INV_REPORT_QUESTION_MIN = 3;

/**
 * The catalogue, as a query.
 *
 * The only read on this surface that may fire on a render: the route is static,
 * identical for every caller, deterministic, makes no provider call and spends
 * no credits — its own comment on the controller says as much. `catalog` tier,
 * because it is one.
 */
export function useInvReportCatalog() {
  const canRead = useCan("inventory:ai:read");
  return useQuery<InvReportCatalog, Error>({
    queryKey: queryKeys.inventoryReportBuilder.catalog(),
    queryFn: () => apiClient.get<InvReportCatalog>("/inventory/ai/reports/catalog"),
    staleTime: 30 * 60_000,
    enabled: canRead,
  });
}

/**
 * A mutation rather than a query, deliberately — the same reason the copilot's
 * ask is one. Asking may spend credits, so it happens because a human pressed
 * something, and it never sits behind a `staleTime` that could refetch it on a
 * window focus.
 */
export function useInvReportAsk() {
  return useMutation<InvReportPreview, Error, InvReportAskInput>({
    mutationKey: queryKeys.inventoryReportBuilder.ask,
    mutationFn: (body) =>
      apiClient.post<InvReportPreview>("/inventory/ai/reports/ask", body),
  });
}

/**
 * Take the file.
 *
 * The spec goes back exactly as it arrived: re-deriving it from the question
 * would let the same words produce a different report the second time, which is
 * why the server split the two routes in the first place. No question means no
 * model call and no credits.
 *
 * A mutation and not a query — the response is a file, and a CSV held in the
 * query cache would keep every byte of it for the rest of the session.
 *
 * `X-Row-Count` rides on the response and is not readable through a Blob. It
 * does not need to be: the export re-runs the report at the server's export cap,
 * so the count that matters is a claim only the server can make, and the preview
 * above the control already says how much of the report it is showing.
 */
export function useInvReportExport() {
  return useMutation<void, Error, InvReportSpec>({
    mutationKey: queryKeys.inventoryReportBuilder.export,
    mutationFn: async (spec) => {
      const blob = await apiClient.download("/inventory/ai/reports/export", undefined, {
        method: "POST",
        body: { spec },
      });
      downloadBlob(blob, `inventory-${spec.report.replace(/_/g, "-")}.csv`);
    },
  });
}
