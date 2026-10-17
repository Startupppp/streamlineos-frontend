"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract, type LazyResponseContract } from "@/lib/api-envelope";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type {
  PlaybookEntry,
  SalesAging,
  SalesCohort,
  SalesCreatedQuota,
  SalesCycleLength,
  SalesFunnel,
  SalesLeaderboard,
  SalesLostAnalysis,
  SalesQuota,
  SalesRepComparison,
  SalesVelocity,
} from "@/hooks/api/crm/sales-schema";

const schema = () => import("@/hooks/api/crm/sales-schema");
const funnelLazy = lazyContract(() => schema().then((m) => m.salesFunnelContract));
const leaderboardLazy = lazyContract(() => schema().then((m) => m.salesLeaderboardContract));
const velocityLazy = lazyContract(() => schema().then((m) => m.salesVelocityContract));
const agingLazy = lazyContract(() => schema().then((m) => m.salesAgingContract));
const cohortLazy = lazyContract(() => schema().then((m) => m.salesCohortContract));
const cycleLengthLazy = lazyContract(() => schema().then((m) => m.salesCycleLengthContract));
const lostAnalysisLazy = lazyContract(() => schema().then((m) => m.salesLostAnalysisContract));
const repComparisonLazy = lazyContract(() => schema().then((m) => m.salesRepComparisonContract));
const quotasLazy = lazyContract(() => schema().then((m) => m.salesQuotasContract));
const createdQuotaLazy = lazyContract(() => schema().then((m) => m.salesCreatedQuotaContract));
const playbookLazy = lazyContract(() => schema().then((m) => m.playbookEntriesContract));
const playbookEntryLazy = lazyContract(() => schema().then((m) => m.playbookEntryContract));
const playbookRemovedLazy = lazyContract(() => schema().then((m) => m.playbookRemovedContract));

/** `from`/`to` are ISO dates; every dashboard read is an aggregate, so they all share one cadence. */
export interface SalesRange {
  from?: string;
  to?: string;
}

const REPORT_STALE = 2 * 60_000;

function useSalesReport<T>(
  permission: PermissionKey,
  report: string,
  params: Record<string, string | undefined>,
  contract: LazyResponseContract<T>,
  enabled = true,
) {
  return useGatedQuery(permission, {
    queryKey: accessAndCrmQueryKeys.sales.report(report, params),
    queryFn: ({ signal }) => apiClient.get<T>(`/sales/dashboard/${report}`, params, signal, contract),
    staleTime: REPORT_STALE,
    enabled,
  });
}

export function useSalesFunnel(range: SalesRange) {
  return useSalesReport<SalesFunnel>("sales:view", "funnel", { ...range }, funnelLazy);
}

export function useSalesLeaderboard(range: SalesRange) {
  return useSalesReport<SalesLeaderboard>("sales:view", "leaderboard", { ...range }, leaderboardLazy);
}

export function useSalesVelocity(range: SalesRange) {
  return useSalesReport<SalesVelocity>("sales:view", "velocity", { ...range }, velocityLazy);
}

export function useSalesAging(threshold: number) {
  return useSalesReport<SalesAging>("sales:view", "aging", { threshold: String(threshold) }, agingLazy);
}

export function useSalesCohort(months: number) {
  return useSalesReport<SalesCohort>("sales:view", "cohort", { months: String(months) }, cohortLazy);
}

export function useSalesCycleLength() {
  return useSalesReport<SalesCycleLength>("crm:deals:read", "cycle-length", {}, cycleLengthLazy);
}

export function useSalesLostAnalysis() {
  return useSalesReport<SalesLostAnalysis>("crm:deals:read", "lost-analysis", {}, lostAnalysisLazy);
}

/** Two reps side by side. Not read until both are picked. */
export function useSalesRepComparison(rep1: number | null, rep2: number | null, range: SalesRange) {
  return useSalesReport<SalesRepComparison>(
    "sales:view",
    "rep-comparison",
    { rep1: rep1 === null ? undefined : String(rep1), rep2: rep2 === null ? undefined : String(rep2), ...range },
    repComparisonLazy,
    rep1 !== null && rep2 !== null && rep1 !== rep2,
  );
}

export interface SalesQuotaFilters {
  period?: "monthly" | "quarterly" | "yearly";
  limit?: number;
}

/** The backend narrows a rep to their own quotas; a manager sees everyone's. */
export function useSalesQuotas(filters: SalesQuotaFilters = {}) {
  return useGatedQuery("crm:targets:view", {
    queryKey: accessAndCrmQueryKeys.sales.quotas({ ...filters }),
    queryFn: ({ signal }) => apiClient.get<SalesQuota[]>("/sales/quotas", { ...filters }, signal, quotasLazy),
    staleTime: 30_000,
  });
}

export interface CreateSalesQuotaInput {
  userId: string;
  period: "monthly" | "quarterly" | "yearly";
  startDate: string;
  endDate: string;
  targetRevenue: string;
  notes?: string;
}

export function useCreateSalesQuota() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:targets:manage", {
    mutationKey: ["sales", "quotas", "create"] as const,
    mutationFn: (input: CreateSalesQuotaInput) =>
      apiClient.post<SalesCreatedQuota>("/sales/quotas", input, undefined, createdQuotaLazy),
    // The list row carries the rep's name and attainment, which the create response does not.
    onSuccess: () => qc.invalidateQueries({ queryKey: accessAndCrmQueryKeys.sales.quotas() }),
  });
}

export function useSalesPlaybook() {
  return useGatedQuery("sales:view", {
    queryKey: accessAndCrmQueryKeys.sales.playbook(),
    queryFn: ({ signal }) => apiClient.get<PlaybookEntry[]>("/sales/playbook", undefined, signal, playbookLazy),
    staleTime: 2 * 60_000,
  });
}

export interface PlaybookEntryInput {
  title: string;
  category?: string;
  content?: string;
}

function sortEntries(entries: PlaybookEntry[]) {
  return [...entries].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

export function useSavePlaybookEntry() {
  const qc = useQueryClient();
  return useAuthorizedMutation("sales:manage", {
    mutationKey: ["sales", "playbook", "save"] as const,
    mutationFn: ({ entryId, ...input }: PlaybookEntryInput & { entryId?: number }) =>
      entryId === undefined
        ? apiClient.post<PlaybookEntry>("/sales/playbook", input, undefined, playbookEntryLazy)
        : apiClient.patch<PlaybookEntry>(`/sales/playbook/${entryId}`, input, undefined, playbookEntryLazy),
    onSuccess: (saved) =>
      qc.setQueryData<PlaybookEntry[]>(accessAndCrmQueryKeys.sales.playbook(), (entries) =>
        entries ? sortEntries([...entries.filter((e) => e.id !== saved.id), saved]) : entries,
      ),
  });
}

export function useRemovePlaybookEntry() {
  const qc = useQueryClient();
  return useAuthorizedMutation("sales:manage", {
    mutationKey: ["sales", "playbook", "remove"] as const,
    mutationFn: (entryId: number) =>
      apiClient.delete<{ success: true }>(`/sales/playbook/${entryId}`, undefined, undefined, playbookRemovedLazy),
    onSuccess: (_result, entryId) =>
      qc.setQueryData<PlaybookEntry[]>(accessAndCrmQueryKeys.sales.playbook(), (entries) =>
        entries?.filter((e) => e.id !== entryId),
      ),
  });
}
