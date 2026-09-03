"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface RetentionPolicy {
  id: number;
  orgId: string;
  recordType: "employee" | "document" | "case" | "attendance" | "payroll";
  retentionMonths: number;
  countryCode: string | null;
  action: "delete" | "anonymize";
  active: boolean;
  createdAt: string;
}

export interface DataRequest {
  id: number;
  orgId: string;
  subjectUserId: string;
  type: "export" | "delete" | "anonymize";
  status: "pending" | "approved" | "processing" | "completed" | "rejected";
  requestedBy: string | null;
  approvedBy: string | null;
  reason: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface RetentionListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

const RETENTION_KEY = ["hr", "governance", "retention"] as const;
const POLICIES_KEY = [...RETENTION_KEY, "policies"] as const;
const REQUESTS_KEY = [...RETENTION_KEY, "requests"] as const;

export function useRetentionPolicies(params?: { recordType?: string; active?: boolean; page?: number; limit?: number }) {
  const canManageRetention = useCan("hr:retention:manage");
  return useQuery<RetentionListResponse<RetentionPolicy>>({
    queryKey: [...queryKeys.hr.hrRetentionPoliciesAll, params],
    queryFn: ({ signal }) => {
      const p: Record<string, unknown> = {};
      if (params?.recordType) p["recordType"] = params.recordType;
      if (params?.active !== undefined) p["active"] = params.active;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get<RetentionListResponse<RetentionPolicy>>("/hr/governance/retention/policies", p, signal);
    },
    staleTime: 60_000,
    enabled: canManageRetention,
  });
}

export function useDataRequests(params?: { status?: string; type?: string; page?: number; limit?: number }) {
  const canManageRetention = useCan("hr:retention:manage");
  return useQuery<RetentionListResponse<DataRequest>>({
    queryKey: [...queryKeys.hr.hrRetentionRequestsAll, params],
    queryFn: ({ signal }) => {
      const p: Record<string, unknown> = {};
      if (params?.status) p["status"] = params.status;
      if (params?.type) p["type"] = params.type;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get<RetentionListResponse<DataRequest>>("/hr/governance/retention/requests", p, signal);
    },
    staleTime: 30_000,
    enabled: canManageRetention,
  });
}

export function useCreateRetentionPolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation<RetentionPolicy, Error, { recordType: string; retentionMonths: number; action: string; countryCode?: string; active?: boolean }>("hr:retention:manage", {
    mutationKey: [...POLICIES_KEY, "create"],
    mutationFn: (payload) => apiClient.post<RetentionPolicy>("/hr/governance/retention/policies", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POLICIES_KEY });
      toast.success("Retention policy created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteRetentionPolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("hr:retention:manage", {
    mutationKey: [...POLICIES_KEY, "delete"],
    mutationFn: (policyId) => apiClient.delete<void>(`/hr/governance/retention/policies/${policyId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POLICIES_KEY });
      toast.success("Retention policy deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useCreateDataRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation<DataRequest, Error, { subjectUserId: string; type: string; reason?: string }>("hr:retention:manage", {
    mutationKey: [...REQUESTS_KEY, "create"],
    mutationFn: (payload) => apiClient.post<DataRequest>("/hr/governance/retention/requests", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUESTS_KEY });
      toast.success("Data request submitted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useApproveDataRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation<DataRequest, Error, number>("hr:retention:manage", {
    mutationKey: [...REQUESTS_KEY, "approve"],
    mutationFn: (requestId) => apiClient.post<DataRequest>(`/hr/governance/retention/requests/${requestId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUESTS_KEY });
      toast.success("Data request approved");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useProcessDataRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation<Record<string, unknown>, Error, number>("hr:retention:manage", {
    mutationKey: [...REQUESTS_KEY, "process"],
    mutationFn: (requestId) => apiClient.post<Record<string, unknown>>(`/hr/governance/retention/requests/${requestId}/process`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUESTS_KEY });
      toast.success("Data request processed");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
