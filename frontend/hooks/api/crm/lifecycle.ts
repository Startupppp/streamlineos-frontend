"use client";

import { useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accessAndCrmQueryKeys as queryKeys } from "@/lib/query-keys/access-and-crm";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import type {
  LifecycleDetail,
  LifecycleSweepEntry,
  LifecycleSweepResult,
} from "@/hooks/api/crm/lifecycle-schema";
import type {
  CustomerHealthRosterParams,
  CustomerHealthRosterResponse,
  ListLifecyclesParams,
  ListLifecyclesResponse,
} from "@/types/crm/lifecycle";

const schema = () => import("@/hooks/api/crm/lifecycle-schema");
const detailLazy = lazyContract(() => schema().then((m) => m.lifecycleDetailContract));
const signalLazy = lazyContract(() => schema().then((m) => m.recordLifecycleSignalContract));
const renewLazy = lazyContract(() => schema().then((m) => m.renewLifecycleContract));
const closeLazy = lazyContract(() => schema().then((m) => m.closeLifecycleContract));
const sweepLazy = lazyContract(() => schema().then((m) => m.sweepLifecycleTriggersContract));
const considerLazy = lazyContract(() => schema().then((m) => m.considerLifecycleTriggerContract));

function cleanParams<T extends object>(params?: T) {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
  );
}

export function useCustomerLifecycles(params?: ListLifecyclesParams) {
  const query = cleanParams(params);
  return useGatedQuery("crm:lifecycle:view", {
    queryKey: queryKeys.crmLifecycle.list(query),
    queryFn: ({ signal }) =>
      apiClient.get<ListLifecyclesResponse>("/crm/lifecycles", query, signal),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCustomerHealthRoster(params?: CustomerHealthRosterParams) {
  const query = cleanParams(params);
  return useGatedQuery("crm:customer-health:view", {
    queryKey: queryKeys.crmLifecycle.healthRoster(query),
    queryFn: ({ signal }) =>
      apiClient.get<CustomerHealthRosterResponse>("/crm/customer-health", query, signal),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useRecomputeCustomerHealth() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:customer-health:manage", {
    mutationKey: ["crm", "customer-health", "recompute"],
    mutationFn: (partyId: string) =>
      apiClient.post<{ data: unknown }>(`/crm/customer-health/${partyId}/recompute`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmLifecycle.all });
    },
  });
}

/** One contract with the evidence behind its score, newest signal first. */
export function useCustomerLifecycle(customerLifecycleId: string | null) {
  return useGatedQuery("crm:lifecycle:view", {
    queryKey: queryKeys.crmLifecycle.detail(customerLifecycleId ?? ""),
    queryFn: async ({ signal }) =>
      (
        await apiClient.get<{ data: LifecycleDetail }>(
          `/crm/lifecycles/${customerLifecycleId}`,
          undefined,
          signal,
          detailLazy,
        )
      ).data,
    staleTime: 60_000,
    enabled: customerLifecycleId !== null,
  });
}

export interface RecordLifecycleSignalInput {
  customerLifecycleId: string;
  kind: LifecycleSignalKind;
  impact?: number;
  note?: string;
}

export type LifecycleSignalKind =
  | "support-escalation"
  | "invoice-overdue"
  | "champion-departed"
  | "usage-decline"
  | "detractor-response"
  | "relationship-silence"
  | "expansion-interest"
  | "renewal-commitment"
  | "note";

/**
 * The renewal book's list is filtered server-side by status, band and renewal
 * window — after a write the row may belong to a different page or none, which
 * the client cannot decide. So the detail is patched from the response and the
 * list prefix is marked stale rather than patched into a wrong membership.
 */
function useLifecycleWriteSettled() {
  const qc = useQueryClient();
  return (customerLifecycleId: string, patch: Partial<LifecycleDetail>) => {
    qc.setQueryData<LifecycleDetail>(
      queryKeys.crmLifecycle.detail(customerLifecycleId),
      (current) => (current ? { ...current, ...patch } : current),
    );
    void qc.invalidateQueries({ queryKey: queryKeys.crmLifecycle.list() });
  };
}

export function useRecordLifecycleSignal() {
  const settle = useLifecycleWriteSettled();
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:lifecycle:manage", {
    mutationKey: ["crm", "lifecycle", "signal"],
    mutationFn: ({ customerLifecycleId, ...body }: RecordLifecycleSignalInput) =>
      apiClient.post(
        `/crm/lifecycles/${customerLifecycleId}/signals`,
        body,
        undefined,
        signalLazy,
      ),
    onSuccess: ({ data }, { customerLifecycleId }) => {
      const current = qc.getQueryData<LifecycleDetail>(
        queryKeys.crmLifecycle.detail(customerLifecycleId),
      );
      settle(customerLifecycleId, {
        riskScore: data.riskScore,
        band: data.band,
        lastSignalAt: data.signal.observedAt,
        signals: [
          {
            lifecycleSignalId: data.signal.lifecycleSignalId,
            kind: data.signal.kind,
            impact: data.signal.impact,
            observedAt: data.signal.observedAt,
            source: data.signal.source,
            recordedByUserId: data.signal.recordedByUserId,
            note: data.signal.note,
          },
          ...(current?.signals ?? []),
        ],
      });
    },
  });
}

export interface RenewLifecycleInput {
  customerLifecycleId: string;
  termMonths?: number;
  contractValueMinor?: number;
  startedOn?: string;
  note?: string;
}

export function useRenewLifecycle() {
  const settle = useLifecycleWriteSettled();
  return useAuthorizedMutation("crm:lifecycle:manage", {
    mutationKey: ["crm", "lifecycle", "renew"],
    mutationFn: ({ customerLifecycleId, ...body }: RenewLifecycleInput) =>
      apiClient.post(`/crm/lifecycles/${customerLifecycleId}/renew`, body, undefined, renewLazy),
    onSuccess: ({ data }) => settle(data.customerLifecycleId, data),
  });
}

export interface CloseLifecycleInput {
  customerLifecycleId: string;
  status: "churned" | "cancelled";
  reason: string;
}

export function useCloseLifecycle() {
  const settle = useLifecycleWriteSettled();
  return useAuthorizedMutation("crm:lifecycle:manage", {
    mutationKey: ["crm", "lifecycle", "close"],
    mutationFn: ({ customerLifecycleId, ...body }: CloseLifecycleInput) =>
      apiClient.post(`/crm/lifecycles/${customerLifecycleId}/close`, body, undefined, closeLazy),
    onSuccess: ({ data }) => settle(data.customerLifecycleId, data),
  });
}

/**
 * Walk the renewal book and hand what is due to the outbound loop. Spends AI
 * credits and opens hold windows, hence its own key and an idempotency key so a
 * retried press is not a second sweep.
 */
export function useSweepLifecycleTriggers() {
  return useAuthorizedIdempotentMutation<LifecycleSweepResult, Error, { limit?: number }>(
    "crm:lifecycle-triggers:run",
    {
      mutationKey: ["crm", "lifecycle-triggers", "sweep"],
      mutationFn: (body, idempotencyKey) =>
        apiClient.post(
          "/crm/lifecycle-triggers/sweep",
          body,
          { headers: { "Idempotency-Key": idempotencyKey } },
          sweepLazy,
        ),
    },
  );
}

/** The sweep's decision for one contract — "look at this one now", not an override. */
export function useConsiderLifecycleTrigger() {
  return useAuthorizedIdempotentMutation<LifecycleSweepEntry, Error, string>(
    "crm:lifecycle-triggers:run",
    {
      mutationKey: ["crm", "lifecycle-triggers", "consider"],
      mutationFn: (customerLifecycleId, idempotencyKey) =>
        apiClient.post(
          `/crm/lifecycle-triggers/${customerLifecycleId}/consider`,
          undefined,
          { headers: { "Idempotency-Key": idempotencyKey } },
          considerLazy,
        ),
    },
  );
}
