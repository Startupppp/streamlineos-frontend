"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const unionMembershipListContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/labor-schema").then((m) => m.unionMembershipListContract),
);
const unionMembershipRowContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/labor-schema").then((m) => m.unionMembershipContract),
);
const collectiveAgreementListContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/labor-schema").then((m) => m.collectiveAgreementListContract),
);
const collectiveAgreementRowContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/labor-schema").then((m) => m.collectiveAgreementContract),
);
const expiringAgreementsContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/labor-schema").then((m) => m.expiringAgreementsListContract),
);
const laborCaseListContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/labor-schema").then((m) => m.laborCaseListContract),
);
const laborCaseRowContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/labor-schema").then((m) => m.laborCaseContract),
);
const laborDeleteContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/labor-schema").then((m) => m.laborDeleteContract),
);

export interface UnionMembership {
  id: number;
  orgId: string;
  userId: string;
  unionName: string;
  memberSince: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface CollectiveAgreement {
  id: number;
  orgId: string;
  unionName: string;
  title: string;
  effectiveFrom: string;
  expiresAt: string | null;
  documentUrl: string | null;
  status: "active" | "expired" | "negotiating";
  createdAt: string;
}

export interface LaborCase {
  id: number;
  orgId: string;
  unionName: string;
  subject: string;
  description: string;
  status: "open" | "in_review" | "resolved";
  createdBy: string | null;
  createdAt: string;
}

export interface LaborListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

const LABOR_KEY = ["hr", "governance", "labor"] as const;

export function useUnionMemberships(params?: { unionName?: string; status?: string; page?: number; limit?: number }) {
  const canViewLabor = useCan("hr:labor:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrLaborMembershipsAll, params],
    queryFn: ({ signal }) => {
      const p: Record<string, unknown> = {};
      if (params?.unionName) p["unionName"] = params.unionName;
      if (params?.status) p["status"] = params.status;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get("/hr/governance/labor/memberships", p, signal, unionMembershipListContract);
    },
    staleTime: 30_000,
    enabled: canViewLabor,
  });
}

export function useCollectiveAgreements(params?: { status?: string; unionName?: string; page?: number; limit?: number }) {
  const canViewLabor = useCan("hr:labor:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrLaborAgreementsAll, params],
    queryFn: ({ signal }) => {
      const p: Record<string, unknown> = {};
      if (params?.status) p["status"] = params.status;
      if (params?.unionName) p["unionName"] = params.unionName;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get("/hr/governance/labor/agreements", p, signal, collectiveAgreementListContract);
    },
    staleTime: 30_000,
    enabled: canViewLabor,
  });
}

export function useExpiringAgreements(days = 30) {
  const canViewLabor = useCan("hr:labor:view");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.hrLaborAgreementsExpiring(days),
    queryFn: ({ signal }) =>
      apiClient.get("/hr/governance/labor/agreements/expiring", { days }, signal, expiringAgreementsContract),
    staleTime: 60_000,
    enabled: canViewLabor,
  });
}

export function useLaborCases(params?: { status?: string; unionName?: string; page?: number; limit?: number }) {
  const canViewLabor = useCan("hr:labor:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrLaborCasesAll, params],
    queryFn: ({ signal }) => {
      const p: Record<string, unknown> = {};
      if (params?.status) p["status"] = params.status;
      if (params?.unionName) p["unionName"] = params.unionName;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get("/hr/governance/labor/cases", p, signal, laborCaseListContract);
    },
    staleTime: 30_000,
    enabled: canViewLabor,
  });
}

export function useCreateUnionMembership() {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, { userId: string; unionName: string; memberSince: string; status: string }>("hr:labor:manage", {
    mutationKey: [...LABOR_KEY, "memberships", "create"],
    mutationFn: (payload) => apiClient.post("/hr/governance/labor/memberships", payload, undefined, unionMembershipRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrLaborMembershipsAll });
      toast.success("Union membership created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteUnionMembership() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("hr:labor:manage", {
    mutationKey: [...LABOR_KEY, "memberships", "delete"],
    mutationFn: (membershipId) => apiClient.delete(`/hr/governance/labor/memberships/${membershipId}`, undefined, undefined, laborDeleteContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrLaborMembershipsAll });
      toast.success("Union membership deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useCreateCollectiveAgreement() {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, { unionName: string; title: string; effectiveFrom: string; status: string; expiresAt?: string; documentUrl?: string }>("hr:labor:manage", {
    mutationKey: [...LABOR_KEY, "agreements", "create"],
    mutationFn: (payload) => apiClient.post("/hr/governance/labor/agreements", payload, undefined, collectiveAgreementRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrLaborAgreementsAll });
      toast.success("Collective agreement created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteCollectiveAgreement() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("hr:labor:manage", {
    mutationKey: [...LABOR_KEY, "agreements", "delete"],
    mutationFn: (agreementId) => apiClient.delete(`/hr/governance/labor/agreements/${agreementId}`, undefined, undefined, laborDeleteContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrLaborAgreementsAll });
      toast.success("Collective agreement deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useCreateLaborCase() {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, { unionName: string; subject: string; description: string; status?: string }>("hr:labor:manage", {
    mutationKey: [...LABOR_KEY, "cases", "create"],
    mutationFn: (payload) => apiClient.post("/hr/governance/labor/cases", payload, undefined, laborCaseRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrLaborCasesAll });
      toast.success("Labor case created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteLaborCase() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("hr:labor:manage", {
    mutationKey: [...LABOR_KEY, "cases", "delete"],
    mutationFn: (caseId) => apiClient.delete(`/hr/governance/labor/cases/${caseId}`, undefined, undefined, laborDeleteContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrLaborCasesAll });
      toast.success("Labor case deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
