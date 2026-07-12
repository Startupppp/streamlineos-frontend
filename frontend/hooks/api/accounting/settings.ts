"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  ApprovalPolicy,
  ApprovalRecordType,
  ApprovalRequest,
  ApprovalStatus,
  ExchangeRate,
} from "@/types/accounting/taxes";

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const settingsKeys = {
  all: [...queryKeys.accounting.all, "settings"] as const,
  policies: (params?: object) =>
    [...queryKeys.accounting.all, "settings", "policies", params] as const,
  rates: (params?: object) =>
    [...queryKeys.accounting.all, "settings", "exchange-rates", params] as const,
};

const approvalsKeys = {
  all: [...queryKeys.accounting.all, "approvals"] as const,
  list: (params?: object) =>
    [...queryKeys.accounting.all, "approvals", "list", params] as const,
  counts: [...queryKeys.accounting.all, "approvals", "counts"] as const,
};

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export interface ListApprovalPoliciesParams {
  page?: number;
  pageSize?: number;
}

export function useApprovalPolicies(params: ListApprovalPoliciesParams = {}) {
  return useQuery<ListResponse<ApprovalPolicy>, Error>({
    queryKey: settingsKeys.policies(params),
    queryFn: () =>
      apiClient.get<ListResponse<ApprovalPolicy>>(
        "/accounting/approval-policies",
        toQuery(params),
      ),
    staleTime: 60_000,
  });
}

export interface CreateApprovalPolicyInput {
  recordType: ApprovalRecordType;
  minAmount?: string;
  approverRole?: string;
  approverUserId?: string;
  isActive?: boolean;
}

export function useCreateApprovalPolicy() {
  const queryClient = useQueryClient();
  return useMutation<ApprovalPolicy, Error, CreateApprovalPolicyInput>({
    mutationKey: ["accounting", "approval-policies", "create"],
    mutationFn: (data) =>
      apiClient.post<ApprovalPolicy>("/accounting/approval-policies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export type UpdateApprovalPolicyInput = Partial<CreateApprovalPolicyInput>;

export function useUpdateApprovalPolicy(id: number) {
  const queryClient = useQueryClient();
  return useMutation<ApprovalPolicy, Error, UpdateApprovalPolicyInput>({
    mutationKey: ["accounting", "approval-policies", "update", id],
    mutationFn: (data) =>
      apiClient.patch<ApprovalPolicy>(`/accounting/approval-policies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useDeleteApprovalPolicy() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: ["accounting", "approval-policies", "delete"],
    mutationFn: (id) =>
      apiClient.delete<void>(`/accounting/approval-policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export interface ListApprovalsParams {
  status?: ApprovalStatus;
  recordType?: string;
  page?: number;
  pageSize?: number;
}

export function useApprovals(params: ListApprovalsParams = {}) {
  return useQuery<ListResponse<ApprovalRequest>, Error>({
    queryKey: approvalsKeys.list(params),
    queryFn: () =>
      apiClient.get<ListResponse<ApprovalRequest>>(
        "/accounting/approvals",
        toQuery(params),
      ),
    staleTime: 30_000,
  });
}

export interface ApprovalCounts {
  PENDING: number;
  APPROVED: number;
  REJECTED: number;
}

export function useApprovalCounts() {
  return useQuery<ApprovalCounts, Error>({
    queryKey: approvalsKeys.counts,
    queryFn: () => apiClient.get<ApprovalCounts>("/accounting/approvals/counts"),
    staleTime: 30_000,
  });
}

export interface ApprovalDecisionInput {
  comment?: string;
}

export function useApproveRequest(requestId: number) {
  const queryClient = useQueryClient();
  return useMutation<ApprovalRequest, Error, ApprovalDecisionInput>({
    mutationKey: ["accounting", "approvals", "approve", requestId],
    mutationFn: (data) =>
      apiClient.post<ApprovalRequest>(
        `/accounting/approvals/${requestId}/approve`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalsKeys.all });
    },
  });
}

export function useRejectRequest(requestId: number) {
  const queryClient = useQueryClient();
  return useMutation<ApprovalRequest, Error, ApprovalDecisionInput>({
    mutationKey: ["accounting", "approvals", "reject", requestId],
    mutationFn: (data) =>
      apiClient.post<ApprovalRequest>(
        `/accounting/approvals/${requestId}/reject`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalsKeys.all });
    },
  });
}

export interface ListExchangeRatesParams {
  page?: number;
  pageSize?: number;
}

export function useExchangeRates(params: ListExchangeRatesParams = {}) {
  return useQuery<ListResponse<ExchangeRate>, Error>({
    queryKey: settingsKeys.rates(params),
    queryFn: () =>
      apiClient.get<ListResponse<ExchangeRate>>(
        "/accounting/exchange-rates",
        toQuery(params),
      ),
    staleTime: 120_000,
  });
}

export interface UpsertExchangeRateInput {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  asOfDate: string;
}

export function useUpsertExchangeRate() {
  const queryClient = useQueryClient();
  return useMutation<ExchangeRate, Error, UpsertExchangeRateInput>({
    mutationKey: ["accounting", "exchange-rates", "upsert"],
    mutationFn: (data) => apiClient.post<ExchangeRate>("/accounting/exchange-rates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
