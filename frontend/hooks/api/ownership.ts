"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAccess, useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface OrgTransferRecord {
  id: string;
  scope: "ORGANIZATION" | "MODULE";
  moduleKey: string | null;
  fromMembershipId: number;
  toMembershipId: number;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED";
  initiatedAt: string;
  respondedAt: string | null;
  expiresAt: string;
  reason: string | null;
}

interface OrgTransfersResponse {
  data: OrgTransferRecord[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface IncomingTransferRecord
  extends Omit<OrgTransferRecord, "respondedAt"> {
  fromName: string | null;
  fromEmail: string | null;
}

interface IncomingTransfersResponse {
  data: IncomingTransferRecord[];
}

interface InitiateOrgTransferResult {
  transferId: string;
  expiresAt: string;
}

export function useInitiateOrgTransfer() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    InitiateOrgTransferResult,
    Error,
    { toMembershipId: number; expiresInHours?: number; reason?: string }
  >("ownership:org:transfer", {
    mutationKey: ["ownership", "org", "transfer", "initiate"],
    mutationFn: (body) =>
      apiClient.post<InitiateOrgTransferResult>(
        "/ownership/org/transfer",
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.ownership.orgTransfers(),
      });
    },
  });
}

export function usePendingOrgTransfers() {
  const canView = useCan("ownership:modules:view");

  return useQuery<OrgTransfersResponse, Error>({
    queryKey: queryKeys.ownership.orgTransfers(),
    queryFn: ({ signal }) =>
      apiClient.get<OrgTransfersResponse>("/ownership/transfers", {
        scope: "ORGANIZATION",
        status: "PENDING",
        limit: "5",
      }, signal),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function useIncomingOrgTransfers() {
  const { isPending: accessPending } = useAccess();
  const canRespond = useCan("ownership:transfer:respond");

  return useQuery<IncomingTransfersResponse, Error>({
    queryKey: queryKeys.ownership.incomingTransfers(),
    queryFn: ({ signal }) =>
      apiClient.get<IncomingTransfersResponse>("/ownership/transfers/incoming", undefined, signal),
    enabled: !accessPending && canRespond,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useCancelOrgTransfer() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: true }, Error, string>("ownership:modules:manage", {
    mutationKey: ["ownership", "org", "transfer", "cancel"],
    mutationFn: (transferId) =>
      apiClient.delete<{ success: true }>(`/ownership/transfers/${transferId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.ownership.orgTransfers(),
      });
    },
  });
}

export function useAcceptTransfer() {
  const queryClient = useQueryClient();
  const { update } = useSession();

  return useAuthorizedMutation<{ success: true }, Error, string>("ownership:transfer:respond", {
    mutationKey: ["ownership", "transfer", "accept"],
    mutationFn: (transferId) =>
      apiClient.post<{ success: true }>(
        `/ownership/transfers/${transferId}/accept`,
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.ownership.all,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.access.me() });
      void update();
    },
  });
}

export function useDeclineTransfer() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { success: true },
    Error,
    { transferId: string; reason?: string }
  >("ownership:transfer:respond", {
    mutationKey: ["ownership", "transfer", "decline"],
    mutationFn: ({ transferId, reason }) =>
      apiClient.post<{ success: true }>(
        `/ownership/transfers/${transferId}/decline`,
        { reason },
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.ownership.all,
      });
    },
  });
}
