"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";
import type {
  ApprovalPolicy,
  ApprovalRecordType,
  ApprovalRequest,
  ApprovalStatus,
  ExchangeRate,
} from "@/types/accounting/taxes";

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

interface ListApprovalPoliciesParams {
  cursor?: string;
  limit?: number;
}

export function useApprovalPolicies(params: ListApprovalPoliciesParams = {}) {
  const can = useCan("accounting:approvals:read");
  return useQuery<CursorPage<ApprovalPolicy>, Error>({
    queryKey: settingsKeys.policies(params),
    queryFn: () =>
      apiClient.get<CursorPage<ApprovalPolicy>>(
        "/accounting/approval-policies",
        toQuery(params),
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

interface CreateApprovalPolicyInput {
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

type UpdateApprovalPolicyInput = Partial<CreateApprovalPolicyInput>;

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

interface ListApprovalsParams {
  status?: ApprovalStatus;
  recordType?: string;
  cursor?: string;
  limit?: number;
}

export function useApprovals(params: ListApprovalsParams = {}) {
  const can = useCan("accounting:approvals:read");
  return useQuery<CursorPage<ApprovalRequest>, Error>({
    queryKey: approvalsKeys.list(params),
    queryFn: () =>
      apiClient.get<CursorPage<ApprovalRequest>>(
        "/accounting/approvals",
        toQuery(params),
      ),
    staleTime: 30_000,
    enabled: can,
  });
}

interface ApprovalCounts {
  PENDING: number;
  APPROVED: number;
  REJECTED: number;
}

export function useApprovalCounts() {
  const can = useCan("accounting:approvals:read");
  return useQuery<ApprovalCounts, Error>({
    queryKey: approvalsKeys.counts,
    queryFn: () => apiClient.get<ApprovalCounts>("/accounting/approvals/counts"),
    staleTime: 30_000,
    enabled: can,
  });
}

interface ApprovalDecisionInput {
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

interface ListExchangeRatesParams {
  cursor?: string;
  limit?: number;
}

export function useExchangeRates(params: ListExchangeRatesParams = {}) {
  const can = useCan("accounting:settings:read");
  return useQuery<CursorPage<ExchangeRate>, Error>({
    queryKey: settingsKeys.rates(params),
    queryFn: () =>
      apiClient.get<CursorPage<ExchangeRate>>(
        "/accounting/exchange-rates",
        toQuery(params),
      ),
    staleTime: 120_000,
    enabled: can,
  });
}

interface UpsertExchangeRateInput {
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
