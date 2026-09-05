"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { useCan } from "@/hooks/api/access";
import type {
  BusinessParty,
  PartiesPage,
  CreatePartyInput,
  UpdatePartyInput,
} from "@/types/party/parties";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface UsePartiesParams {
  page?: number;
  limit?: number;
  partyType?: "CUSTOMER" | "VENDOR" | "PARTNER" | "BOTH";
  /** One list filtered by role, rather than a screen per role. */
  role?: string;
  search?: string;
}

export function useParties(params: UsePartiesParams = {}) {
  const canView = useCan("party:parties:view");
  const { page = 1, limit = 20, partyType, role, search } = params;
  const queryParams: Record<string, unknown> = { page, limit };
  if (partyType) queryParams.partyType = partyType;
  if (role) queryParams.role = role;
  if (search) queryParams.search = search;

  return useQuery({
    queryKey: directoryAndOwnershipQueryKeys.party.parties(queryParams),
    queryFn: ({ signal }) => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (partyType) searchParams.set("partyType", partyType);
      if (role) searchParams.set("role", role);
      if (search) searchParams.set("search", search);
      return apiClient.get<PartiesPage>(`/party/parties?${searchParams.toString()}`, undefined, signal);
    },
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useParty(partyId: string | null) {
  const canView = useCan("party:parties:view");

  return useQuery({
    queryKey: directoryAndOwnershipQueryKeys.party.party(partyId ?? ""),
    queryFn: ({ signal }) => apiClient.get<BusinessParty>(`/party/parties/${partyId}`, undefined, signal),
    staleTime: 60_000,
    enabled: canView && !!partyId,
  });
}

export function useCreateParty() {
  const qc = useQueryClient();
  return useAuthorizedMutation("party:parties:create", {
    mutationKey: ["party", "parties", "create"],
    mutationFn: (input: CreatePartyInput) =>
      apiClient.post<BusinessParty>("/party/parties", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.all });
    },
  });
}

export function useUpdateParty() {
  const qc = useQueryClient();
  return useAuthorizedMutation("party:parties:update", {
    mutationKey: ["party", "parties", "update"],
    mutationFn: ({ partyId, ...input }: UpdatePartyInput & { partyId: string }) =>
      apiClient.patch<BusinessParty>(`/party/parties/${partyId}`, input),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.party.party(variables.partyId),
      });
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.parties() });
    },
  });
}

export function useDeleteParty() {
  const qc = useQueryClient();
  return useAuthorizedMutation("party:parties:delete", {
    mutationKey: ["party", "parties", "delete"],
    mutationFn: (partyId: string) =>
      apiClient.delete(`/party/parties/${partyId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.parties() });
    },
  });
}

