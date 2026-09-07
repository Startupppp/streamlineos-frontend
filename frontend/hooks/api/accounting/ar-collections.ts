"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";
import type {
  ReminderPolicy,
  ReminderLogEntry,
  CollectionActivity,
  CollectionsSummary,
  CreateReminderPolicyInput,
  UpdateReminderPolicyInput,
  CreateCollectionActivityInput,
  UpdateInvoiceCollectionInput,
} from "@/types/accounting/ar";
import type { Invoice } from "@/types/invoice";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";
import {
  reminderPolicyContract,
  reminderPolicyListContract,
  reminderLogListContract,
  collectionSummaryContract,
  collectionActivityCreatedContract,
  reminderPolicyDeleteContract,
  invoiceCollectionUpdateContract,
} from "@/hooks/api/accounting/ar-schema";

const base = [...queryKeyBase, "accounting"] as const;

const arCollectionsKeys = {
  reminders: {
    policies: [...base, "reminder-policies"] as const,
    log: (p?: unknown) => [...base, "reminder-log", p] as const,
  },
  collections: {
    summary: [...base, "collections-summary"] as const,
    activities: (p?: unknown) => [...base, "collections-activities", p] as const,
  },
};

interface ListResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  pagination?: { limit: number; hasMore: boolean; nextCursor: number | null };
}

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export type ListReminderPoliciesParams = {
  limit?: number;
  cursor?: number;
};

export function useReminderPolicies(params: ListReminderPoliciesParams = {}) {
  const can = useCan("accounting:reminders:read");
  return useQuery<ListResponse<ReminderPolicy>, Error>({
    queryKey: accountingAndSupportQueryKeys.accounting.arReminderPolicies(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/accounting/reminders/policies",
        toQuery(params), signal, reminderPolicyListContract,
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export interface ListReminderLogParams {
  invoiceId?: number;
  limit?: number;
  cursor?: number;
}

export function useReminderLog(params: ListReminderLogParams = {}) {
  const can = useCan("accounting:reminders:read");
  return useQuery<ListResponse<ReminderLogEntry>, Error>({
    queryKey: arCollectionsKeys.reminders.log(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/accounting/reminders/log",
        toQuery(params), signal, reminderLogListContract,
      ),
    staleTime: 30_000,
    enabled: can,
  });
}

export function useCollectionsSummary() {
  const can = useCan("accounting:collections:read");
  return useQuery<CollectionsSummary, Error>({
    queryKey: arCollectionsKeys.collections.summary,
    queryFn: ({ signal }) =>
      apiClient.get("/accounting/collections/summary", undefined, signal, collectionSummaryContract),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCreateReminderPolicy() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ReminderPolicy, Error, CreateReminderPolicyInput>("accounting:reminders:manage", {
    mutationKey: ["create-reminder-policy"],
    mutationFn: (body) =>
      apiClient.post("/accounting/reminders/policies", body, undefined, reminderPolicyContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: arCollectionsKeys.reminders.policies });
    },
  });
}

export function useUpdateReminderPolicy() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    ReminderPolicy,
    Error,
    { policyId: number } & UpdateReminderPolicyInput
  >("accounting:reminders:manage", {
    mutationKey: ["update-reminder-policy"],
    mutationFn: ({ policyId, ...body }) =>
      apiClient.patch(
        `/accounting/reminders/policies/${policyId}`,
        body, undefined, reminderPolicyContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: arCollectionsKeys.reminders.policies });
    },
  });
}

export function useDeleteReminderPolicy() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: true }, Error, { policyId: number }>("accounting:reminders:manage", {
    mutationKey: ["delete-reminder-policy"],
    mutationFn: ({ policyId }) =>
      apiClient.delete(
        `/accounting/reminders/policies/${policyId}`,
        undefined, undefined, reminderPolicyDeleteContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: arCollectionsKeys.reminders.policies });
    },
  });
}

export function useCreateCollectionActivity() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<CollectionActivity, Error, CreateCollectionActivityInput>("accounting:collections:manage", {
    mutationKey: ["create-collection-activity"],
    mutationFn: (body) =>
      apiClient.post("/accounting/collections/activities", body, undefined, collectionActivityCreatedContract),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: arCollectionsKeys.collections.activities(),
        exact: false,
      });
    },
  });
}

type InvoiceCollectionSnapshot = [
  readonly unknown[],
  ListResponse<Invoice> | undefined,
];

interface InvoiceCollectionContext {
  snapshots: InvoiceCollectionSnapshot[];
}

export function useUpdateInvoiceCollection() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { success: true },
    Error,
    { invoiceId: number } & UpdateInvoiceCollectionInput,
    InvoiceCollectionContext
  >("accounting:collections:manage", {
    mutationKey: ["update-invoice-collection"],
    mutationFn: ({ invoiceId, ...body }) =>
      apiClient.patch(
        `/accounting/collections/invoices/${invoiceId}`,
        body, undefined, invoiceCollectionUpdateContract,
      ),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: platformCoreQueryKeys.invoice.all });
      const snapshots = queryClient.getQueriesData<ListResponse<Invoice>>({
        queryKey: platformCoreQueryKeys.invoice.all,
      });
      for (const [key, data] of snapshots) {
        if (!data) continue;
        queryClient.setQueryData<ListResponse<Invoice>>(key as readonly unknown[], {
          ...data,
          items: data.items.map((inv) =>
            inv.id === variables.invoiceId
              ? {
                  ...inv,
                  ...(variables.collectionOwnerId !== undefined && {
                    collectionOwnerId: variables.collectionOwnerId,
                  }),
                  ...(variables.promiseToPayDate !== undefined && {
                    promiseToPayDate: variables.promiseToPayDate,
                  }),
                }
              : inv,
          ),
        });
      }
      return { snapshots };
    },
    onError: (_, _vars, context) => {
      if (!context) return;
      for (const [key, data] of context.snapshots) {
        queryClient.setQueryData(key as readonly unknown[], data);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.invoice.all });
    },
  });
}
