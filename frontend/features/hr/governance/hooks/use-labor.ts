"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

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
  return useQuery<LaborListResponse<UnionMembership>>({
    queryKey: [...LABOR_KEY, "memberships", params],
    queryFn: () => {
      const p: Record<string, unknown> = {};
      if (params?.unionName) p["unionName"] = params.unionName;
      if (params?.status) p["status"] = params.status;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get<LaborListResponse<UnionMembership>>("/hr/governance/labor/memberships", p);
    },
    staleTime: 30_000,
  });
}

export function useCollectiveAgreements(params?: { status?: string; unionName?: string; page?: number; limit?: number }) {
  return useQuery<LaborListResponse<CollectiveAgreement>>({
    queryKey: [...LABOR_KEY, "agreements", params],
    queryFn: () => {
      const p: Record<string, unknown> = {};
      if (params?.status) p["status"] = params.status;
      if (params?.unionName) p["unionName"] = params.unionName;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get<LaborListResponse<CollectiveAgreement>>("/hr/governance/labor/agreements", p);
    },
    staleTime: 30_000,
  });
}

export function useExpiringAgreements(days = 30) {
  return useQuery<{ data: CollectiveAgreement[]; daysWindow: number }>({
    queryKey: [...LABOR_KEY, "agreements", "expiring", days],
    queryFn: () =>
      apiClient.get<{ data: CollectiveAgreement[]; daysWindow: number }>("/hr/governance/labor/agreements/expiring", { days }),
    staleTime: 60_000,
  });
}

export function useLaborCases(params?: { status?: string; unionName?: string; page?: number; limit?: number }) {
  return useQuery<LaborListResponse<LaborCase>>({
    queryKey: [...LABOR_KEY, "cases", params],
    queryFn: () => {
      const p: Record<string, unknown> = {};
      if (params?.status) p["status"] = params.status;
      if (params?.unionName) p["unionName"] = params.unionName;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get<LaborListResponse<LaborCase>>("/hr/governance/labor/cases", p);
    },
    staleTime: 30_000,
  });
}

export function useCreateUnionMembership() {
  const qc = useQueryClient();
  return useMutation<UnionMembership, Error, { userId: string; unionName: string; memberSince: string; status: string }>({
    mutationKey: [...LABOR_KEY, "memberships", "create"],
    mutationFn: (payload) => apiClient.post<UnionMembership>("/hr/governance/labor/memberships", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...LABOR_KEY, "memberships"] });
      toast.success("Union membership created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateUnionMembership() {
  const qc = useQueryClient();
  return useMutation<UnionMembership, Error, { membershipId: number; data: Partial<UnionMembership & { memberSince: string }> }>({
    mutationKey: [...LABOR_KEY, "memberships", "update"],
    mutationFn: ({ membershipId, data }) =>
      apiClient.patch<UnionMembership>(`/hr/governance/labor/memberships/${membershipId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...LABOR_KEY, "memberships"] });
      toast.success("Union membership updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteUnionMembership() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: [...LABOR_KEY, "memberships", "delete"],
    mutationFn: (membershipId) => apiClient.delete<void>(`/hr/governance/labor/memberships/${membershipId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...LABOR_KEY, "memberships"] });
      toast.success("Union membership deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useCreateCollectiveAgreement() {
  const qc = useQueryClient();
  return useMutation<CollectiveAgreement, Error, { unionName: string; title: string; effectiveFrom: string; status: string; expiresAt?: string; documentUrl?: string }>({
    mutationKey: [...LABOR_KEY, "agreements", "create"],
    mutationFn: (payload) => apiClient.post<CollectiveAgreement>("/hr/governance/labor/agreements", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...LABOR_KEY, "agreements"] });
      toast.success("Collective agreement created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteCollectiveAgreement() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: [...LABOR_KEY, "agreements", "delete"],
    mutationFn: (agreementId) => apiClient.delete<void>(`/hr/governance/labor/agreements/${agreementId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...LABOR_KEY, "agreements"] });
      toast.success("Collective agreement deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useCreateLaborCase() {
  const qc = useQueryClient();
  return useMutation<LaborCase, Error, { unionName: string; subject: string; description: string; status?: string }>({
    mutationKey: [...LABOR_KEY, "cases", "create"],
    mutationFn: (payload) => apiClient.post<LaborCase>("/hr/governance/labor/cases", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...LABOR_KEY, "cases"] });
      toast.success("Labor case created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateLaborCase() {
  const qc = useQueryClient();
  return useMutation<LaborCase, Error, { caseId: number; data: Partial<LaborCase> }>({
    mutationKey: [...LABOR_KEY, "cases", "update"],
    mutationFn: ({ caseId, data }) => apiClient.patch<LaborCase>(`/hr/governance/labor/cases/${caseId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...LABOR_KEY, "cases"] });
      toast.success("Labor case updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteLaborCase() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: [...LABOR_KEY, "cases", "delete"],
    mutationFn: (caseId) => apiClient.delete<void>(`/hr/governance/labor/cases/${caseId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...LABOR_KEY, "cases"] });
      toast.success("Labor case deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
