"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const allOffersPageC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offers-schema").then((m) => m.allOffersPageContract),
);
const offerVersionsListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offers-schema").then((m) => m.offerVersionsListContract),
);
const offerNegotiationsListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offers-schema").then((m) => m.offerNegotiationsListContract),
);
const candidateOffersListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offers-schema").then((m) => m.candidateOffersListContract),
);
const createCandidateOfferC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offers-schema").then((m) => m.createCandidateOfferContract),
);
const updateCandidateOfferC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offers-schema").then((m) => m.updateCandidateOfferContract),
);
const deleteCandidateOfferC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offers-schema").then((m) => m.deleteCandidateOfferContract),
);
const respondToNegotiationC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offers-schema").then((m) => m.respondToNegotiationContract),
);
const submitOfferForApprovalC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offers-schema").then((m) => m.submitOfferForApprovalContract),
);
const approveOfferC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offers-schema").then((m) => m.approveOfferContract),
);
const rejectOfferApprovalC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offers-schema").then((m) => m.rejectOfferApprovalContract),
);

/**
 * Summed and divided into months by the backend, never here — the money
 * arithmetic has one implementation and it is not in a browser.
 */
export interface CandidateOfferCtcPreview {
  lines: {
    key: string;
    label: string;
    recurrence: "MONTHLY" | "LUMP_SUM";
    annual: string;
    monthly: string | null;
  }[];
  annualTotal: string | null;
  monthlyTotal: string | null;
  lumpSumTotal: string | null;
  malformed: string[];
  reconciliation: {
    status: "MATCHED" | "MISMATCHED" | "NOT_COMPARABLE";
    difference: string | null;
    message: string | null;
  };
}

export interface CandidateOffer {
  id: number;
  orgId: string;
  candidateId: number;
  jobPostingId: number | null;
  offeredBy: string | null;
  offerStatus: string;
  offeredSalary: string | null;
  offeredDesignation: string | null;
  /**
   * Null per component means nobody entered it; "0.00" means the offer states
   * there is none of it. The two must not render the same.
   */
  ctcFixed: string | null;
  ctcVariable: string | null;
  ctcJoiningBonus: string | null;
  ctcEquityValue: string | null;
  ctcEmployerPf: string | null;
  ctcGratuity: string | null;
  /** Present on the list route, which computes it; absent on a write's response. */
  ctcPreview?: CandidateOfferCtcPreview;
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
  offerStatus: string;
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
  direction: string;
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
    queryKey: [...humanResourcesQueryKeys.hr.all, "allOffers", queryParams] as const,
    queryFn: ({ signal }): Promise<{
      items: OfferListItem[];
      total: number;
      pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
    }> => {
      return apiClient.get(
        "/hr/recruitment/offers",
        queryParams,
        signal,
        allOffersPageC,
      );
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: canOffers,
  });
}

export function useOfferVersions(candidateId: number, offerId: number) {
  return useGatedQuery("hr:offers:view", {
    queryKey: [...humanResourcesQueryKeys.hr.all, "offerVersions", offerId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<OfferVersion[]>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}/versions`, undefined, signal, offerVersionsListC),
    enabled: candidateId > 0 && offerId > 0,
    staleTime: 60_000,
  });
}

export function useOfferNegotiations(candidateId: number, offerId: number) {
  return useGatedQuery("hr:offers:view", {
    queryKey: [...humanResourcesQueryKeys.hr.all, "offerNegotiations", offerId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<OfferNegotiation[]>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}/negotiations`, undefined, signal, offerNegotiationsListC),
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
        undefined,
        respondToNegotiationC,
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "offerNegotiations", variables.offerId] });
      void qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "offerVersions", variables.offerId] });
      void qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "candidateOffers", candidateId] });
    },
  });
}

export function useCandidateOffers(candidateId: number) {
  const canView = useCan("hr:offers:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "candidateOffers", candidateId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<CandidateOffer[]>(`/hr/recruitment/candidates/${candidateId}/offers`, undefined, signal, candidateOffersListC),
    staleTime: 2 * 60_000,
    enabled: canView && candidateId > 0,
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
      /**
       * Omit a component nobody entered; send 0 only to state that the offer
       * carries none of it. The backend keeps the two apart all the way to the
       * candidate's screen, and it refuses a breakdown that does not add up to
       * `offeredSalary` in the same payload.
       */
      ctcFixed?: number;
      ctcVariable?: number;
      ctcJoiningBonus?: number;
      ctcEquityValue?: number;
      ctcEmployerPf?: number;
      ctcGratuity?: number;
      joiningDate?: string;
      offerLetterUrl?: string;
      validUntil?: string;
      notes?: string;
    }) => apiClient.post<CandidateOffer>(`/hr/recruitment/candidates/${candidateId}/offers`, data, undefined, createCandidateOfferC),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useUpdateCandidateOffer(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:offers:manage", {
    mutationKey: ["hr", "recruitment", "offers", "update", candidateId],
    mutationFn: ({ offerId, ...data }: { offerId: number; offerStatus?: CandidateOffer["offerStatus"]; notes?: string; joiningDate?: string; validUntil?: string; offeredSalary?: number; offeredDesignation?: string; ctcFixed?: number; ctcVariable?: number; ctcJoiningBonus?: number; ctcEquityValue?: number; ctcEmployerPf?: number; ctcGratuity?: number }) =>
      apiClient.patch<CandidateOffer>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}`, data, undefined, updateCandidateOfferC),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useDeleteCandidateOffer(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:offers:manage", {
    mutationKey: ["hr", "recruitment", "offers", "delete", candidateId],
    mutationFn: (offerId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}`, undefined, undefined, deleteCandidateOfferC),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useSubmitOfferForApproval(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:offers:manage", {
    mutationKey: ["hr", "recruitment", "offers", "submit-approval", candidateId],
    mutationFn: (offerId: number) =>
      apiClient.post<CandidateOffer>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}/submit-for-approval`, {}, undefined, submitOfferForApprovalC),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useApproveOffer(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:offers:approve", {
    mutationKey: ["hr", "recruitment", "offers", "approve", candidateId],
    mutationFn: ({ offerId, remarks }: { offerId: number; remarks?: string }) =>
      apiClient.post<CandidateOffer>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}/approve`, { remarks }, undefined, approveOfferC),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useRejectOfferApproval(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:offers:approve", {
    mutationKey: ["hr", "recruitment", "offers", "reject-approval", candidateId],
    mutationFn: ({ offerId, remarks }: { offerId: number; remarks?: string }) =>
      apiClient.post<CandidateOffer>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}/reject-approval`, { remarks }, undefined, rejectOfferApprovalC),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}
