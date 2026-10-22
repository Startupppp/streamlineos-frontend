import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { travelMineQueryOptions, travelApprovalsQueryOptions } from "@/hooks/api/hr/travel-read-options";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { invalidateCalendarProjectionWindows } from "@/lib/calendar-projection-cache";

const travelListContract = lazyContract(() =>
  import("@/hooks/api/hr/travel-schema").then((m) => m.travelRequestListContract),
);
const travelRowContract = lazyContract(() =>
  import("@/hooks/api/hr/travel-schema").then((m) => m.travelRequestContract),
);

export interface TravelRequest {
  id: number;
  orgId: string;
  userId: string;
  userMembershipId: number | null;
  purpose: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  flightRequired: boolean;
  hotelRequired: boolean;
  advanceRequired: boolean;
  advanceAmount: string | null;
  estimatedCost: string | null;
  perDiem: string | null;
  itinerary: Array<{ date: string; activity: string; location: string }>;
  status: "DRAFT" | "PENDING" | "MANAGER_APPROVED" | "FINANCE_APPROVED" | "REJECTED" | "COMPLETED";
  managerApproverId: string | null;
  managerApproverMembershipId: number | null;
  managerApprovedAt: string | null;
  financeApproverId: string | null;
  financeApproverMembershipId: number | null;
  financeApprovedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useMyTravelRequests() {
  return useGatedQuery("hr:travel:view", {
    ...travelMineQueryOptions(),
    queryFn: ({ signal }) => apiClient.get("/hr/travel", undefined, signal, travelListContract),
  });
}

export function usePendingTravelApprovals() {
  return useGatedQuery("hr:travel:manage", {
    ...travelApprovalsQueryOptions(),
    queryFn: ({ signal }) => apiClient.get("/hr/travel/approvals", undefined, signal, travelListContract),
  });
}

export interface CreateTravelInput {
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
  itinerary?: Array<{ date: string; activity: string; location: string }>;
}

export function useCreateTravelRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:travel:create", {
    mutationKey: ["hr", "travel", "create"],
    mutationFn: (data: CreateTravelInput) =>
      apiClient.post("/hr/travel", data, undefined, travelRowContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.travelAll });
      invalidateCalendarProjectionWindows(qc);
    },
  });
}

export function useManagerApproveTravelRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:travel:manage", {
    mutationKey: ["hr", "travel", "manager-approve"],
    mutationFn: (travelId: number) => apiClient.patch(`/hr/travel/${travelId}/manager-approve`, undefined, undefined, travelRowContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.travelAll });
      invalidateCalendarProjectionWindows(qc);
    },
  });
}

export function useFinanceApproveTravelRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:travel:manage", {
    mutationKey: ["hr", "travel", "finance-approve"],
    mutationFn: (travelId: number) => apiClient.patch(`/hr/travel/${travelId}/finance-approve`, undefined, undefined, travelRowContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.travelAll });
      invalidateCalendarProjectionWindows(qc);
    },
  });
}

export function useRejectTravelRequest() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<unknown, Error, { travelId: number; reason: string }>("hr:travel:manage", {
    mutationKey: ["hr", "travel", "reject"],
    mutationFn: ({ travelId, reason }, idempotencyKey) =>
      apiClient.patch(`/hr/travel/${travelId}/reject`, { reason }, { headers: { "Idempotency-Key": idempotencyKey } }, travelRowContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.travelAll });
      invalidateCalendarProjectionWindows(qc);
    },
  });
}
