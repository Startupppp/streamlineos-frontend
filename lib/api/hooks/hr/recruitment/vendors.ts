"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type VendorStatus = "ACTIVE" | "INACTIVE";
export type VendorPlacementStatus = "SUBMITTED" | "INTERVIEWING" | "PLACED" | "REJECTED";
export type VendorInvoiceStatus = "NOT_INVOICED" | "INVOICED" | "PAID";

export interface RecruitmentVendor {
  id: number;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  feePercent: string | null;
  status: VendorStatus;
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
}

export interface UpdateVendorInput {
  name?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  feePercent?: number;
  status?: VendorStatus;
}

export interface CreateSubmissionInput {
  candidateId: number;
  jobPostingId?: number;
}

export interface UpdateSubmissionInput {
  placementStatus?: VendorPlacementStatus;
  invoiceStatus?: VendorInvoiceStatus;
  invoiceAmount?: number;
  invoiceDate?: string;
  paidAt?: string;
}

export function useRecruitmentVendors() {
  return useQuery({
    queryKey: queryKeys.hr.recruitmentVendors(),
    queryFn: () => apiClient.get<RecruitmentVendor[]>("/hr/recruitment/vendors"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVendorInput) => apiClient.post<RecruitmentVendor>("/hr/recruitment/vendors", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentVendors() });
    },
  });
}

export function useUpdateVendor(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateVendorInput) =>
      apiClient.patch<RecruitmentVendor>(`/hr/recruitment/vendors/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentVendors() });
    },
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/hr/recruitment/vendors/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentVendors() });
    },
  });
}

export function useVendorSubmissions(vendorId: number) {
  return useQuery({
    queryKey: queryKeys.hr.vendorSubmissions(vendorId),
    queryFn: () => apiClient.get<VendorSubmission[]>(`/hr/recruitment/vendors/${vendorId}/submissions`),
    enabled: vendorId > 0,
    staleTime: 60_000,
  });
}

export function useCreateVendorSubmission(vendorId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSubmissionInput) =>
      apiClient.post<VendorSubmission>(`/hr/recruitment/vendors/${vendorId}/submissions`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.vendorSubmissions(vendorId) });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentVendors() });
    },
  });
}

export function useUpdateVendorSubmission(vendorId: number, submissionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSubmissionInput) =>
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
