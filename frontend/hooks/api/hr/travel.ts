import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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
  return useQuery<TravelRequest[]>({
    queryKey: ["hr", "travel", "mine"],
    queryFn: () => apiClient.get<TravelRequest[]>("/hr/travel"),
    staleTime: 60_000,
  });
}

export function usePendingTravelApprovals() {
  return useQuery<TravelRequest[]>({
    queryKey: ["hr", "travel", "approvals"],
    queryFn: () => apiClient.get<TravelRequest[]>("/hr/travel/approvals"),
    staleTime: 30_000,
  });
}

export function useCreateTravelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "travel", "create"],
    mutationFn: (data: Omit<TravelRequest, "id" | "orgId" | "userId" | "status" | "createdAt">) =>
      apiClient.post<TravelRequest>("/hr/travel", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "travel"] }),
  });
}

export function useManagerApproveTravelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "travel", "manager-approve"],
    mutationFn: (id: number) => apiClient.patch<TravelRequest>(`/hr/travel/${id}/manager-approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "travel"] }),
  });
}

export function useFinanceApproveTravelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "travel", "finance-approve"],
    mutationFn: (id: number) => apiClient.patch<TravelRequest>(`/hr/travel/${id}/finance-approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "travel"] }),
  });
}

export function useRejectTravelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "travel", "reject"],
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiClient.patch<TravelRequest>(`/hr/travel/${id}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "travel"] }),
  });
}
