"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

/**
 * Stock valuation against the journals it should have produced.
 *
 * Read-only by design on the backend, and read-only here: the fix for a
 * `MISSING_COA` row is a chart-of-accounts entry in the accounting module, and
 * the fix for an `UNMATCHED` row is re-running the document that should have
 * posted. Neither belongs to a report.
 *
 * Both routes were mounted and neither was called from this repo, so the one
 * report that can say "this movement produced no journal entry" was unreachable.
 */

export const GL_RECON_STATUSES = [
  "MATCHED",
  "VALUE_MISMATCH",
  "MISSING_COA",
  "UNMATCHED",
  "ACCOUNTING_NOT_INSTALLED",
] as const;
export type GlReconStatus = (typeof GL_RECON_STATUSES)[number];

export interface GlReconRow {
  sourceType: string;
  sourceId: string;
  label: string;
  sourceEvent: string;
  postedOn: string;
  movementValue: string;
  netQuantity: string;
  movementCount: number;
  hasCost: boolean;
  accountCodes: string[];
  missingAccountCodes: string[];
  journalEntryId: number | null;
  journalEntryNumber: string | null;
  journalEntryDate: string | null;
  journalStatus: string | null;
  journalValue: string | null;
  status: GlReconStatus;
}

export interface GlReconSummary {
  groups: number;
  matched: number;
  valueMismatch: number;
  missingCoa: number;
  unmatched: number;
  notInstalled: number;
  movementValue: string;
  journalValue: string;
  unreconciledValue: string;
}

export interface GlReconReport {
  generatedAt: string;
  window: { fromDate: string; toDate: string; period: { id: number; name: string } | null };
  accounting: { journalsInstalled: boolean; note: string | null };
  rules: Array<{ sourceType: string; sourceEvent: string; label: string; accountCodes: string[] }>;
  summary: GlReconSummary;
  unpostedByDesign: Array<{ sourceType: string; movementCount: number; movementValue: string }>;
  orphanJournals: Array<{
    journalEntryId: number;
    journalEntryNumber: string;
    journalEntryDate: string;
    sourceType: string;
    sourceId: string | null;
    sourceEvent: string | null;
    journalStatus: string;
    journalValue: string;
  }>;
  items: GlReconRow[];
  total: number;
  page: number;
  totalPages: number;
}

export interface GlReconPeriod {
  periodId: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface GlReconFilters {
  periodId?: number;
  fromDate?: string;
  toDate?: string;
  warehouseId?: number;
  status?: GlReconStatus;
  page?: number;
  limit?: number;
}

export function useGlReconciliation(filters?: GlReconFilters) {
  const canView = useCan("inventory:reports:read");
  return useQuery<GlReconReport, Error>({
    queryKey: queryKeys.inventoryGlRecon.report(filters as Record<string, unknown>),
    queryFn: () => {
      const params: Record<string, string> = {};
      if (filters?.periodId) params.periodId = String(filters.periodId);
      if (filters?.fromDate) params.fromDate = filters.fromDate;
      if (filters?.toDate) params.toDate = filters.toDate;
      if (filters?.warehouseId) params.warehouseId = String(filters.warehouseId);
      if (filters?.status) params.status = filters.status;
      if (filters?.page) params.page = String(filters.page);
      if (filters?.limit) params.limit = String(filters.limit);
      return apiClient.get<GlReconReport>("/inventory/reconciliation/gl", params);
    },
    // A period-scoped comparison over a ledger that is still being written to.
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useGlReconPeriods() {
  const canView = useCan("inventory:reports:read");
  return useQuery<{ installed: boolean; items: GlReconPeriod[] }, Error>({
    queryKey: queryKeys.inventoryGlRecon.periods,
    queryFn: () =>
      apiClient.get<{ installed: boolean; items: GlReconPeriod[] }>(
        "/inventory/reconciliation/gl/periods",
      ),
    staleTime: 30 * 60_000,
    enabled: canView,
  });
}
