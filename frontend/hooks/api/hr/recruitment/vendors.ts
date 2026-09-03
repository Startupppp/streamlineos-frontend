"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

export type VendorStatus = "ACTIVE" | "INACTIVE";
export type VendorPlacementStatus = "SUBMITTED" | "INTERVIEWING" | "PLACED" | "REJECTED";
export type VendorInvoiceStatus = "NOT_INVOICED" | "INVOICED" | "PAID";
export type VendorContractType = "CONTINGENCY" | "CONTRACT_STAFFING" | "BOTH";

export interface RecruitmentVendor {
  id: number;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  feePercent: string | null;
  status: VendorStatus;
  contractType: VendorContractType;
  slaDays: number | null;
  replacementGuaranteeDays: number | null;
  createdAt: string;
  submissionCount: number;
  placements: number;
  revenueTotal: string;
}

export interface VendorSubmission {
  id: number;
  candidateId: number;
  jobPostingId: number | null;
  submittedAt: string;
  placementStatus: VendorPlacementStatus;
  invoiceStatus: VendorInvoiceStatus;
  invoiceAmount: string | null;
  invoiceDate: string | null;
  paidAt: string | null;
  billRate: string | null;
  payRate: string | null;
  margin: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  candidateFirstName: string | null;
  candidateLastName: string | null;
  candidateEmail: string | null;
  jobTitle: string | null;
}

export interface CreateVendorInput {
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  feePercent?: number;
  status?: VendorStatus;
  contractType?: VendorContractType;
  slaDays?: number;
  replacementGuaranteeDays?: number;
}

export interface UpdateVendorInput {
  name?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  feePercent?: number;
  status?: VendorStatus;
  contractType?: VendorContractType;
  slaDays?: number;
  replacementGuaranteeDays?: number;
}

export interface CreateSubmissionInput {
  candidateId: number;
  jobPostingId?: number;
  billRate?: number;
  payRate?: number;
  contractStartDate?: string;
  contractEndDate?: string;
}

export interface UpdateSubmissionInput {
  placementStatus?: VendorPlacementStatus;
  invoiceStatus?: VendorInvoiceStatus;
  invoiceAmount?: number;
  invoiceDate?: string;
  paidAt?: string;
  billRate?: number;
  payRate?: number;
  contractStartDate?: string;
  contractEndDate?: string;
}

export function useRecruitmentVendors() {
  return useGatedQuery("hr:employees:view", {
    queryKey: queryKeys.hr.recruitmentVendors(),
    queryFn: ({ signal }) => apiClient.get<RecruitmentVendor[]>("/hr/recruitment/vendors", undefined, signal),
    staleTime: 2 * 60_000,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "vendors", "create"],
    mutationFn: (data: CreateVendorInput) => apiClient.post<RecruitmentVendor>("/hr/recruitment/vendors", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentVendors() });
    },
  });
}

export function useUpdateVendor(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "vendors", "update", id],
    mutationFn: (data: UpdateVendorInput) =>
      apiClient.patch<RecruitmentVendor>(`/hr/recruitment/vendors/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentVendors() });
    },
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "vendors", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/recruitment/vendors/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentVendors() });
    },
  });
}

export function useVendorSubmissions(vendorId: number) {
  return useQuery({
    queryKey: queryKeys.hr.vendorSubmissions(vendorId),
    queryFn: ({ signal }) => apiClient.get<VendorSubmission[]>(`/hr/recruitment/vendors/${vendorId}/submissions`, undefined, signal),
    enabled: vendorId > 0,
    staleTime: 60_000,
  });
}

export function useCreateVendorSubmission(vendorId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "vendor-submissions", "create", vendorId],
    mutationFn: (data: CreateSubmissionInput) =>
      apiClient.post<VendorSubmission>(`/hr/recruitment/vendors/${vendorId}/submissions`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.vendorSubmissions(vendorId) });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentVendors() });
    },
  });
}

export function useUpdateVendorSubmission(vendorId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "vendor-submissions", "update", vendorId],
    mutationFn: ({ submissionId, ...data }: UpdateSubmissionInput & { submissionId: number }) =>
      apiClient.patch<VendorSubmission>(
        `/hr/recruitment/vendors/${vendorId}/submissions?submissionId=${submissionId}`,
        data,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.vendorSubmissions(vendorId) });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentVendors() });
    },
  });
}

export function useGenerateVendorPortalLink(vendorId: number) {
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "vendors", "portal-link", vendorId],
    mutationFn: () =>
      apiClient.post<{ portalToken: string; portalTokenExpiresAt: string }>(
        `/hr/recruitment/vendors/${vendorId}/portal-link`,
      ),
  });
}
