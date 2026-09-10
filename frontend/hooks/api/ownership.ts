"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useAccess, useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useSessionClaimsRefresh } from "@/hooks/common/auth-hooks";
import { lazyContract } from "@/lib/api-envelope";

const initiateTransferContract = lazyContract(() =>
  import("@/hooks/api/ownership-schema").then((m) => m.initiateTransferContract),
);
const transfersPageContract = lazyContract(() =>
  import("@/hooks/api/ownership-schema").then((m) => m.transfersPageContract),
);
const incomingTransfersContract = lazyContract(() =>
  import("@/hooks/api/ownership-schema").then((m) => m.incomingTransfersContract),
);
const ownershipMutationContract = lazyContract(() =>
  import("@/hooks/api/ownership-schema").then((m) => m.ownershipMutationContract),
);

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
        undefined,
        initiateTransferContract,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.ownership.orgTransfers(),
      });
    },
  });
}

export function usePendingOrgTransfers() {
  const canView = useCan("ownership:modules:view");

  return useQuery<OrgTransfersResponse, Error>({
    queryKey: directoryAndOwnershipQueryKeys.ownership.orgTransfers(),
    queryFn: ({ signal }) =>
      apiClient.get<OrgTransfersResponse>("/ownership/transfers", {
        scope: "ORGANIZATION",
        status: "PENDING",
        limit: "5",
      }, signal, transfersPageContract),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function useIncomingOrgTransfers() {
  const { isPending: accessPending } = useAccess();
  const canRespond = useCan("ownership:transfer:respond");

  return useQuery<IncomingTransfersResponse, Error>({
    queryKey: directoryAndOwnershipQueryKeys.ownership.incomingTransfers(),
    queryFn: ({ signal }) =>
      apiClient.get<IncomingTransfersResponse>("/ownership/transfers/incoming", undefined, signal, incomingTransfersContract),
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
      apiClient.delete(`/ownership/transfers/${transferId}`, undefined, undefined, ownershipMutationContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.ownership.orgTransfers(),
      });
    },
  });
}

export function useAcceptTransfer() {
  const queryClient = useQueryClient();
  const refreshSessionClaims = useSessionClaimsRefresh();

  return useAuthorizedMutation<{ success: true }, Error, string>("ownership:transfer:respond", {
    mutationKey: ["ownership", "transfer", "accept"],
    mutationFn: (transferId) =>
      apiClient.post(
        `/ownership/transfers/${transferId}/accept`,
        undefined,
        undefined,
        ownershipMutationContract,
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.ownership.all,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.access.me() });
      void refreshSessionClaims();
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
      apiClient.post(
        `/ownership/transfers/${transferId}/decline`,
        { reason },
        undefined,
        ownershipMutationContract,
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.ownership.all,
      });
    },
  });
}
