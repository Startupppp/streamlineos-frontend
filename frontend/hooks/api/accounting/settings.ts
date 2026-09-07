"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";
import type {
  ApprovalPolicy,
  ApprovalRecordType,
  ApprovalRequest,
  ApprovalStatus,
  ExchangeRate,
} from "@/types/accounting/taxes";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  approvalPolicyListContract,
  approvalPolicyCreatedContract,
  approvalPolicyUpdatedContract,
  approvalPolicyDeletedContract,
  approvalQueueContract,
  approvalCountsContract,
  approvalDecisionContract,
  exchangeRateListContract,
  exchangeRateCreatedContract,
} from "@/hooks/api/accounting/settings-schema";

const settingsKeys = {
  all: [...accountingAndSupportQueryKeys.accounting.all, "settings"] as const,
  policies: (params?: object) =>
    [...accountingAndSupportQueryKeys.accounting.all, "settings", "policies", params] as const,
  rates: (params?: object) =>
    [...accountingAndSupportQueryKeys.accounting.all, "settings", "exchange-rates", params] as const,
};

const approvalsKeys = {
  all: [...accountingAndSupportQueryKeys.accounting.all, "approvals"] as const,
  list: (params?: object) =>
    [...accountingAndSupportQueryKeys.accounting.all, "approvals", "list", params] as const,
  counts: [...accountingAndSupportQueryKeys.accounting.all, "approvals", "counts"] as const,
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
    queryFn: ({ signal }) =>
      apiClient.get(
        "/accounting/approval-policies",
        toQuery(params), signal, approvalPolicyListContract,
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
  return useAuthorizedMutation<ApprovalPolicy, Error, CreateApprovalPolicyInput>("accounting:settings:manage", {
    mutationKey: ["accounting", "approval-policies", "create"],
    mutationFn: (data) =>
      apiClient.post("/accounting/approval-policies", data, undefined, approvalPolicyCreatedContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

type UpdateApprovalPolicyInput = Partial<CreateApprovalPolicyInput>;

export function useUpdateApprovalPolicy(id: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ApprovalPolicy, Error, UpdateApprovalPolicyInput>("accounting:settings:manage", {
    mutationKey: ["accounting", "approval-policies", "update", id],
    mutationFn: (data) =>
      apiClient.patch(`/accounting/approval-policies/${id}`, data, undefined, approvalPolicyUpdatedContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useDeleteApprovalPolicy() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("accounting:settings:manage", {
    mutationKey: ["accounting", "approval-policies", "delete"],
    mutationFn: (id) =>
      apiClient.delete(`/accounting/approval-policies/${id}`, undefined, undefined, approvalPolicyDeletedContract),
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
    queryFn: ({ signal }) =>
      apiClient.get(
        "/accounting/approvals",
        toQuery(params), signal, approvalQueueContract,
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
    queryFn: ({ signal }) => apiClient.get("/accounting/approvals/counts", undefined, signal, approvalCountsContract),
    staleTime: 30_000,
    enabled: can,
  });
}

interface ApprovalDecisionInput {
  comment?: string;
}

export function useApproveRequest(requestId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ApprovalRequest, Error, ApprovalDecisionInput>("accounting:approvals:decide", {
    mutationKey: ["accounting", "approvals", "approve", requestId],
    mutationFn: (data) =>
      apiClient.post(
        `/accounting/approvals/${requestId}/approve`,
        data, undefined, approvalDecisionContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalsKeys.all });
    },
  });
}

export function useRejectRequest(requestId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ApprovalRequest, Error, ApprovalDecisionInput>("accounting:approvals:decide", {
    mutationKey: ["accounting", "approvals", "reject", requestId],
    mutationFn: (data) =>
      apiClient.post(
        `/accounting/approvals/${requestId}/reject`,
        data, undefined, approvalDecisionContract,
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
    queryFn: ({ signal }) =>
      apiClient.get(
        "/accounting/exchange-rates",
        toQuery(params), signal, exchangeRateListContract,
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
  return useAuthorizedMutation<ExchangeRate, Error, UpsertExchangeRateInput>("accounting:settings:manage", {
    mutationKey: ["accounting", "exchange-rates", "upsert"],
    mutationFn: (data) => apiClient.post("/accounting/exchange-rates", data, undefined, exchangeRateCreatedContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
