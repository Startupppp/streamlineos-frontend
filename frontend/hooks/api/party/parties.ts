"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  BusinessParty,
  PartyContact,
  PartiesPage,
  CreatePartyInput,
  UpdatePartyInput,
  CreateContactInput,
  UpdateContactInput,
} from "@/types/party/parties";

export interface UsePartiesParams {
  page?: number;
  limit?: number;
  partyType?: "CUSTOMER" | "VENDOR" | "PARTNER" | "BOTH";
  search?: string;
}

export function useParties(params: UsePartiesParams = {}) {
  const canView = useCan("party:parties:view");
  const { page = 1, limit = 20, partyType, search } = params;
  const queryParams: Record<string, unknown> = { page, limit };
  if (partyType) queryParams.partyType = partyType;
  if (search) queryParams.search = search;

  return useQuery({
    queryKey: queryKeys.party.parties(queryParams),
    queryFn: () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (partyType) searchParams.set("partyType", partyType);
      if (search) searchParams.set("search", search);
      return apiClient.get<PartiesPage>(`/party/parties?${searchParams.toString()}`);
    },
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useParty(partyId: string) {
  const canView = useCan("party:parties:view");
  return useQuery({
    queryKey: queryKeys.party.party(partyId),
    queryFn: () => apiClient.get<BusinessParty>(`/party/parties/${partyId}`),
    staleTime: 60_000,
    enabled: canView && !!partyId,
  });
}

export function useCreateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "parties", "create"],
    mutationFn: (input: CreatePartyInput) =>
      apiClient.post<BusinessParty>("/party/parties", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.party.all });
    },
  });
}

export function useUpdateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "parties", "update"],
    mutationFn: ({ partyId, ...input }: UpdatePartyInput & { partyId: string }) =>
      apiClient.patch<BusinessParty>(`/party/parties/${partyId}`, input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.party.party(variables.partyId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.party.parties() });
    },
  });
}

export function useDeleteParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "parties", "delete"],
    mutationFn: (partyId: string) =>
      apiClient.delete(`/party/parties/${partyId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.party.parties() });
    },
  });
}

export function usePartyContacts(partyId: string) {
  const canView = useCan("party:contacts:view");
  return useQuery({
    queryKey: queryKeys.party.contacts(partyId),
    queryFn: () => apiClient.get<PartyContact[]>(`/party/parties/${partyId}/contacts`),
    staleTime: 60_000,
    enabled: canView && !!partyId,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "contacts", "create"],
    mutationFn: (input: CreateContactInput) =>
      apiClient.post<PartyContact>(`/party/parties/${input.partyId}/contacts`, input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.party.contacts(variables.partyId),
      });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "contacts", "update"],
    mutationFn: ({
      partyContactId,
      partyId,
      ...input
    }: UpdateContactInput & { partyContactId: string; partyId: string }) =>
      apiClient.patch<PartyContact>(`/party/contacts/${partyContactId}`, input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.party.contacts(variables.partyId),
      });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "contacts", "delete"],
    mutationFn: ({ partyContactId }: { partyContactId: string; partyId: string }) =>
      apiClient.delete(`/party/contacts/${partyContactId}`),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.party.contacts(variables.partyId),
      });
    },
  });
}
