"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const retentionPolicyListContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/retention-schema").then((m) => m.retentionPolicyListContract),
);
const retentionPolicyRowContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/retention-schema").then((m) => m.retentionPolicyContract),
);
const dataRequestListContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/retention-schema").then((m) => m.dataRequestListContract),
);
const dataRequestRowContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/retention-schema").then((m) => m.dataRequestContract),
);
const processDataRequestContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/retention-schema").then((m) => m.processDataRequestContract),
);
const retentionDeleteContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/retention-schema").then((m) => m.retentionDeleteContract),
);

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
  subjectMembershipId: number | null;
  type: "export" | "delete" | "anonymize" | "correction";
  status: "pending" | "approved" | "processing" | "completed" | "rejected" | "partial";
  requestedBy: string | null;
  approvedBy: string | null;
  reason: string | null;
  completedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrRetentionPoliciesAll, params],
    queryFn: ({ signal }) => {
      const p: Record<string, unknown> = {};
      if (params?.recordType) p["recordType"] = params.recordType;
      if (params?.active !== undefined) p["active"] = params.active;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get("/hr/governance/retention/policies", p, signal, retentionPolicyListContract);
    },
    staleTime: 60_000,
    enabled: canManageRetention,
  });
}

export function useDataRequests(params?: { status?: string; type?: string; page?: number; limit?: number }) {
  const canManageRetention = useCan("hr:retention:manage");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrRetentionRequestsAll, params],
    queryFn: ({ signal }) => {
      const p: Record<string, unknown> = {};
      if (params?.status) p["status"] = params.status;
      if (params?.type) p["type"] = params.type;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get("/hr/governance/retention/requests", p, signal, dataRequestListContract);
    },
    staleTime: 30_000,
    enabled: canManageRetention,
  });
}

export function useCreateRetentionPolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, { recordType: string; retentionMonths: number; action: string; countryCode?: string; active?: boolean }>("hr:retention:manage", {
    mutationKey: [...POLICIES_KEY, "create"],
    mutationFn: (payload) => apiClient.post("/hr/governance/retention/policies", payload, undefined, retentionPolicyRowContract),
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
    mutationFn: (policyId) => apiClient.delete(`/hr/governance/retention/policies/${policyId}`, undefined, undefined, retentionDeleteContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POLICIES_KEY });
      toast.success("Retention policy deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useCreateDataRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, { subjectUserId: string; type: string; reason?: string }>("hr:retention:manage", {
    mutationKey: [...REQUESTS_KEY, "create"],
    mutationFn: (payload) => apiClient.post("/hr/governance/retention/requests", payload, undefined, dataRequestRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUESTS_KEY });
      toast.success("Data request submitted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useApproveDataRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, number>("hr:retention:manage", {
    mutationKey: [...REQUESTS_KEY, "approve"],
    mutationFn: (requestId) => apiClient.post(`/hr/governance/retention/requests/${requestId}/approve`, undefined, undefined, dataRequestRowContract),
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
    mutationFn: (requestId) => apiClient.post(`/hr/governance/retention/requests/${requestId}/process`, undefined, undefined, processDataRequestContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUESTS_KEY });
      toast.success("Data request processed");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
