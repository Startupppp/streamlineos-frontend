"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface CandidateOffer {
  id: number;
  orgId: string;
  candidateId: number;
  jobPostingId: number | null;
  offeredBy: string | null;
  offerStatus: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED" | "COUNTERED" | "EXPIRED" | "PENDING_APPROVAL" | "APPROVAL_REJECTED";
  offeredSalary: string | null;
  offeredDesignation: string | null;
  joiningDate: string | null;
  offerLetterUrl: string | null;
  validUntil: string | null;
  notes: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalRemarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useGenerateOfferLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { candidateId: number; jobPostingId: number; salary: string; startDate: string }) =>
      apiClient.post<{ documentId: number; title: string }>("/hr/recruitment/offer-letter", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() }),
  });
}

export function useCandidateOffers(candidateId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] as const,
    queryFn: () =>
      apiClient.get<CandidateOffer[]>(`/hr/recruitment/candidates/${candidateId}/offers`),
    staleTime: 2 * 60_000,
    enabled: candidateId > 0,
  });
}

export function useCreateCandidateOffer(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      jobPostingId?: number;
      offeredSalary?: number;
      offeredDesignation?: string;
      joiningDate?: string;
      offerLetterUrl?: string;
      validUntil?: string;
      notes?: string;
    }) => apiClient.post<CandidateOffer>(`/hr/recruitment/candidates/${candidateId}/offers`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useUpdateCandidateOffer(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, ...data }: { offerId: number; offerStatus?: CandidateOffer["offerStatus"]; notes?: string; joiningDate?: string; validUntil?: string; offeredSalary?: number; offeredDesignation?: string }) =>
      apiClient.patch<CandidateOffer>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useDeleteCandidateOffer(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (offerId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useSubmitOfferForApproval(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (offerId: number) =>
      apiClient.post<{ success: boolean }>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}/submit-for-approval`, {}),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useApproveOffer(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, remarks }: { offerId: number; remarks?: string }) =>
      apiClient.post<{ success: boolean }>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}/approve`, { remarks }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useRejectOfferApproval(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, remarks }: { offerId: number; remarks?: string }) =>
      apiClient.post<{ success: boolean }>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}/reject-approval`, { remarks }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}
