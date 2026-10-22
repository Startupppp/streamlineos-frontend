"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { downloadBlob } from "@/lib/download-blob";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";


export type InvReportId =
  | "stock_summary"
  | "reorder"
  | "movements"
  | "slow_moving"
  | "expiry"
  | "valuation";

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
  prompt: string;
}

export interface InvReportStrippedFilter {
  field: string;
  reason: string;
}

export type InvReportStatus = "ok" | "not_permitted";

export interface InvReportPreview {
  status: InvReportStatus;
  question: string;
  spec: InvReportSpec;
  label: string;
  plannedBy: "model" | "deterministic";
  columns: InvReportCatalogColumn[];
  rows: Array<Record<string, string | number | null>>;
  rowCount: number;
  total: number | null;
  truncated: boolean;
  stripped: InvReportStrippedFilter[];
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

export const INV_REPORT_QUESTION_MAX = 400;
export const INV_REPORT_QUESTION_MIN = 3;

export function useInvReportCatalog() {
  const canRead = useCan("inventory:ai:read");
  return useQuery<InvReportCatalog, Error>({
    queryKey: queryKeys.inventoryReportBuilder.catalog(),
    queryFn: ({ signal }) =>
      apiClient.get<InvReportCatalog>("/inventory/ai/reports/catalog", undefined, signal),
    staleTime: 30 * 60_000,
    enabled: canRead,
  });
}

export function useInvReportAsk() {
  return useAuthorizedMutation<InvReportPreview, Error, InvReportAskInput>(
    "inventory:ai:read",
    {
      mutationKey: queryKeys.inventoryReportBuilder.ask,
      mutationFn: (body) =>
        apiClient.post<InvReportPreview>("/inventory/ai/reports/ask", body),
    },
  );
}

export function useInvReportExport() {
  return useAuthorizedMutation<void, Error, InvReportSpec>("inventory:export", {
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
