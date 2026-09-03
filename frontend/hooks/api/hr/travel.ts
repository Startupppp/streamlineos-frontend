import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

export interface TravelRequest {
  id: number;
  orgId: string;
  userId: string;
  purpose: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  flightRequired: boolean;
  hotelRequired: boolean;
  advanceRequired: boolean;
  advanceAmount?: string;
  estimatedCost?: string;
  perDiem?: string;
  status: "DRAFT" | "PENDING" | "MANAGER_APPROVED" | "FINANCE_APPROVED" | "REJECTED" | "COMPLETED";
  rejectionReason?: string;
  createdAt: string;
}

export function useMyTravelRequests() {
  return useGatedQuery<TravelRequest[]>("hr:travel:view", {
    queryKey: queryKeys.hr.travelMine(),
    queryFn: ({ signal }) => apiClient.get<TravelRequest[]>("/hr/travel", undefined, signal),
    staleTime: 60_000,
  });
}

export function usePendingTravelApprovals() {
  return useGatedQuery<TravelRequest[]>("hr:travel:manage", {
    queryKey: queryKeys.hr.travelApprovals(),
    queryFn: ({ signal }) => apiClient.get<TravelRequest[]>("/hr/travel/approvals", undefined, signal),
    staleTime: 30_000,
  });
}

export function useCreateTravelRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:travel:create", {
    mutationKey: ["hr", "travel", "create"],
    mutationFn: (data: Omit<TravelRequest, "id" | "orgId" | "userId" | "status" | "createdAt">) =>
      apiClient.post<TravelRequest>("/hr/travel", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.travelAll }),
  });
}

export function useManagerApproveTravelRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:travel:manage", {
    mutationKey: ["hr", "travel", "manager-approve"],
    mutationFn: (id: number) => apiClient.patch<TravelRequest>(`/hr/travel/${id}/manager-approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.travelAll }),
  });
}

export function useFinanceApproveTravelRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:travel:manage", {
    mutationKey: ["hr", "travel", "finance-approve"],
    mutationFn: (id: number) => apiClient.patch<TravelRequest>(`/hr/travel/${id}/finance-approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.travelAll }),
  });
}

export function useRejectTravelRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:travel:manage", {
    mutationKey: ["hr", "travel", "reject"],
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiClient.patch<TravelRequest>(`/hr/travel/${id}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.travelAll }),
  });
}
