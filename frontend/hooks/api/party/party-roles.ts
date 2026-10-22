"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const rolesLazy = lazyContract(() =>
  import("@/hooks/api/party/party-schema").then((m) => m.partyRolesContract),
);

interface PartyRoles {
  roles: string[];
}

export function usePartyRoles(partyId: string | null) {
  return useGatedQuery("party:parties:view", {
    queryKey: directoryAndOwnershipQueryKeys.party.roles(partyId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<PartyRoles>(`/party/parties/${partyId}/roles`, undefined, signal, rolesLazy),
    staleTime: 60_000,
    enabled: !!partyId,
  });
}

export function useChangePartyRole(partyId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("party:roles:manage", {
    mutationKey: ["party", "roles", "change"] as const,
    mutationFn: ({ role, remove }: { role: string; remove?: boolean }) =>
      remove
        ? apiClient.delete<PartyRoles>(`/party/parties/${partyId}/roles/${encodeURIComponent(role)}`, undefined, undefined, rolesLazy)
        : apiClient.post<PartyRoles>(`/party/parties/${partyId}/roles`, { role }, undefined, rolesLazy),
    onSuccess: (result) => {
      qc.setQueryData(directoryAndOwnershipQueryKeys.party.roles(partyId), result);
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.parties(), refetchType: "none" });
    },
  });
}
