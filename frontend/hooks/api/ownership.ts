"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAccess, useCan } from "@/hooks/api/access";

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
    page: number;
    limit: number;
    total: number;
    totalPages: number;
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
  return useMutation<
    InitiateOrgTransferResult,
    Error,
    { toMembershipId: number; expiresInHours?: number; reason?: string }
  >({
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
  const { data: access } = useAccess();
  const isOwner =
    (access?.isOrgOwner ?? false);

  return useQuery<OrgTransfersResponse, Error>({
    queryKey: queryKeys.ownership.orgTransfers(),
    queryFn: () =>
      apiClient.get<OrgTransfersResponse>("/ownership/transfers", {
        scope: "ORGANIZATION",
        status: "PENDING",
        limit: "5",
      }),
    enabled: isOwner,
    staleTime: 30_000,
  });
}

export function useIncomingOrgTransfers() {
  const { isPending: accessPending } = useAccess();
  const canRespond = useCan("ownership:transfer:respond");

  return useQuery<IncomingTransfersResponse, Error>({
    queryKey: queryKeys.ownership.incomingTransfers(),
    queryFn: () =>
      apiClient.get<IncomingTransfersResponse>("/ownership/transfers/incoming"),
    enabled: !accessPending && canRespond,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useCancelOrgTransfer() {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, Error, string>({
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

  return useMutation<{ success: true }, Error, string>({
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
  return useMutation<
    { success: true },
    Error,
    { transferId: string; reason?: string }
  >({
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
