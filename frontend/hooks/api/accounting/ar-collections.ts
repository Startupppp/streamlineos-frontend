"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  ArInvoice,
  ReminderPolicy,
  ReminderLogEntry,
  CollectionActivity,
  CollectionsSummary,
  CreateReminderPolicyInput,
  UpdateReminderPolicyInput,
  CreateCollectionActivityInput,
  UpdateInvoiceCollectionInput,
} from "@/types/accounting/ar";

const base = ["streamlineos", "accounting"] as const;

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
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export interface ListReminderPoliciesParams {
  page?: number;
  pageSize?: number;
}

export function useReminderPolicies(params: ListReminderPoliciesParams = {}) {
  return useQuery<ListResponse<ReminderPolicy>, Error>({
    queryKey: [...arCollectionsKeys.reminders.policies, params] as const,
    queryFn: () =>
      apiClient.get<ListResponse<ReminderPolicy>>(
        "/accounting/reminders/policies",
        toQuery(params),
      ),
    staleTime: 60_000,
  });
}

export interface ListReminderLogParams {
  invoiceId?: number;
  page?: number;
  pageSize?: number;
}

export function useReminderLog(params: ListReminderLogParams = {}) {
  return useQuery<ListResponse<ReminderLogEntry>, Error>({
    queryKey: arCollectionsKeys.reminders.log(params),
    queryFn: () =>
      apiClient.get<ListResponse<ReminderLogEntry>>(
        "/accounting/reminders/log",
        toQuery(params),
      ),
    staleTime: 30_000,
  });
}

export function useCollectionsSummary() {
  return useQuery<CollectionsSummary, Error>({
    queryKey: arCollectionsKeys.collections.summary,
    queryFn: () =>
      apiClient.get<CollectionsSummary>("/accounting/collections/summary"),
    staleTime: 60_000,
  });
}

export interface ListCollectionActivitiesParams {
  clientId?: number;
  page?: number;
  pageSize?: number;
}

export function useCollectionActivities(
  params: ListCollectionActivitiesParams = {},
) {
  return useQuery<ListResponse<CollectionActivity>, Error>({
    queryKey: arCollectionsKeys.collections.activities(params),
    queryFn: () =>
      apiClient.get<ListResponse<CollectionActivity>>(
        "/accounting/collections/activities",
        toQuery(params),
      ),
    staleTime: 30_000,
  });
}

export function useCreateReminderPolicy() {
  const queryClient = useQueryClient();
  return useMutation<ReminderPolicy, Error, CreateReminderPolicyInput>({
    mutationKey: ["create-reminder-policy"],
    mutationFn: (body) =>
      apiClient.post<ReminderPolicy>("/accounting/reminders/policies", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: arCollectionsKeys.reminders.policies });
    },
  });
}

export function useUpdateReminderPolicy() {
  const queryClient = useQueryClient();
  return useMutation<
    ReminderPolicy,
    Error,
    { policyId: number } & UpdateReminderPolicyInput
  >({
    mutationKey: ["update-reminder-policy"],
    mutationFn: ({ policyId, ...body }) =>
      apiClient.patch<ReminderPolicy>(
        `/accounting/reminders/policies/${policyId}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: arCollectionsKeys.reminders.policies });
    },
  });
}

export function useDeleteReminderPolicy() {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; deleted: boolean }, Error, { policyId: number }>({
    mutationKey: ["delete-reminder-policy"],
    mutationFn: ({ policyId }) =>
      apiClient.delete<{ id: number; deleted: boolean }>(
        `/accounting/reminders/policies/${policyId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: arCollectionsKeys.reminders.policies });
    },
  });
}

export function useCreateCollectionActivity() {
  const queryClient = useQueryClient();
  return useMutation<CollectionActivity, Error, CreateCollectionActivityInput>({
    mutationKey: ["create-collection-activity"],
    mutationFn: (body) =>
      apiClient.post<CollectionActivity>("/accounting/collections/activities", body),
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
  ListResponse<ArInvoice> | undefined,
];

interface InvoiceCollectionContext {
  snapshots: InvoiceCollectionSnapshot[];
}

export function useUpdateInvoiceCollection() {
  const queryClient = useQueryClient();
  return useMutation<
    { id: number; updated: boolean },
    Error,
    { invoiceId: number } & UpdateInvoiceCollectionInput,
    InvoiceCollectionContext
  >({
    mutationKey: ["update-invoice-collection"],
    mutationFn: ({ invoiceId, ...body }) =>
      apiClient.patch<{ id: number; updated: boolean }>(
        `/accounting/collections/invoices/${invoiceId}`,
        body,
      ),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.invoice.all });
      const snapshots = queryClient.getQueriesData<ListResponse<ArInvoice>>({
        queryKey: queryKeys.invoice.all,
      });
      for (const [key, data] of snapshots) {
        if (!data) continue;
        queryClient.setQueryData<ListResponse<ArInvoice>>(key as readonly unknown[], {
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
    onError: (_err, _vars, context) => {
      if (!context) return;
      for (const [key, data] of context.snapshots) {
        queryClient.setQueryData(key as readonly unknown[], data);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice.all });
    },
  });
}
