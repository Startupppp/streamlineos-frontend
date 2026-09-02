"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
  acceptanceToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfferListItem {
  id: number;
  candidateId: number;
  candidateFirstName: string;
  candidateLastName: string;
  candidateEmail: string;
  jobPostingId: number | null;
  jobTitle: string | null;
  offerStatus: CandidateOffer["offerStatus"];
  offeredSalary: string | null;
  offeredDesignation: string | null;
  joiningDate: string | null;
  validUntil: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface OfferVersion {
  id: number;
  offerId: number;
  versionNumber: number;
  offeredSalary: string | null;
  offeredDesignation: string | null;
  joiningDate: string | null;
  validUntil: string | null;
  notes: string | null;
  changeReason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface OfferNegotiation {
  id: number;
  offerId: number;
  direction: "CANDIDATE_COUNTER" | "INTERNAL_RESPONSE";
  proposedSalary: string | null;
  proposedJoiningDate: string | null;
  message: string | null;
  createdBy: string | null;
  createdAt: string;
}

export type AllOffersParams = {
  cursor?: string;
  pageSize?: number;
  status?: OfferListItem["offerStatus"];
};

export function useAllOffers(params?: AllOffersParams) {
  const canOffers = useCan("hr:offers:view");
  const pageSize = params?.pageSize ?? 20;
  const queryParams: Record<string, unknown> = { pageSize };
  if (params?.cursor) queryParams.cursor = params.cursor;
  if (params?.status) queryParams.status = params.status;

  return useQuery({
    queryKey: [...queryKeys.hr.all, "allOffers", queryParams] as const,
    queryFn: ({ signal }): Promise<{
      items: OfferListItem[];
      total: number;
      pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
    }> => {
      return apiClient.get(
        "/hr/recruitment/offers",
        queryParams,
        signal,
      );
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: canOffers,
  });
}

export function useOfferVersions(candidateId: number, offerId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "offerVersions", offerId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<OfferVersion[]>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}/versions`, undefined, signal),
    enabled: candidateId > 0 && offerId > 0,
    staleTime: 60_000,
  });
}

export function useOfferNegotiations(candidateId: number, offerId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "offerNegotiations", offerId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<OfferNegotiation[]>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}/negotiations`, undefined, signal),
    enabled: candidateId > 0 && offerId > 0,
    staleTime: 30_000,
  });
}

export function useRespondToNegotiation(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:offers:manage", {
    mutationKey: ["hr", "recruitment", "offers", "negotiate", candidateId],
    mutationFn: ({
      offerId,
      ...data
    }: {
      offerId: number;
      proposedSalary?: number;
      proposedJoiningDate?: string;
      message?: string;
      applyToOffer?: boolean;
    }) =>
      apiClient.post<OfferNegotiation>(
        `/hr/recruitment/candidates/${candidateId}/offers/${offerId}/negotiations`,
        data,
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "offerNegotiations", variables.offerId] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "offerVersions", variables.offerId] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] });
    },
  });
}

export function useCandidateOffers(candidateId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<CandidateOffer[]>(`/hr/recruitment/candidates/${candidateId}/offers`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: candidateId > 0,
  });
}

export function useCreateCandidateOffer(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:offers:manage", {
    mutationKey: ["hr", "recruitment", "offers", "create", candidateId],
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
  return useAuthorizedMutation("hr:offers:manage", {
    mutationKey: ["hr", "recruitment", "offers", "update", candidateId],
    mutationFn: ({ offerId, ...data }: { offerId: number; offerStatus?: CandidateOffer["offerStatus"]; notes?: string; joiningDate?: string; validUntil?: string; offeredSalary?: number; offeredDesignation?: string }) =>
      apiClient.patch<CandidateOffer>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useDeleteCandidateOffer(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:offers:manage", {
    mutationKey: ["hr", "recruitment", "offers", "delete", candidateId],
    mutationFn: (offerId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useSubmitOfferForApproval(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:offers:manage", {
    mutationKey: ["hr", "recruitment", "offers", "submit-approval", candidateId],
    mutationFn: (offerId: number) =>
      apiClient.post<{ success: boolean }>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}/submit-for-approval`, {}),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useApproveOffer(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:offers:approve", {
    mutationKey: ["hr", "recruitment", "offers", "approve", candidateId],
    mutationFn: ({ offerId, remarks }: { offerId: number; remarks?: string }) =>
      apiClient.post<{ success: boolean }>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}/approve`, { remarks }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useRejectOfferApproval(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:offers:approve", {
    mutationKey: ["hr", "recruitment", "offers", "reject-approval", candidateId],
    mutationFn: ({ offerId, remarks }: { offerId: number; remarks?: string }) =>
      apiClient.post<{ success: boolean }>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}/reject-approval`, { remarks }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}
