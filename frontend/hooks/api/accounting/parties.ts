"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingArQueryKeys } from "@/lib/query-keys/accounting-ar";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  CreatePartyInput,
  CreatePartyTaxRegistrationInput,
  DeletedResult,
  ListPartiesQuery,
  PartyDetail,
  PartyPage,
  PartyTaxRegistration,
  UpdatePartyInput,
} from "@/types/accounting-ar";

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

const STANDARD_LIST_STALE = 30 * 1000;
const ENTITY_STALE = 60 * 1000;

export const PARTIES_READ = "accounting:read";
export const PARTIES_CREATE = "accounting:create";
export const PARTIES_UPDATE = "accounting:update";
export const PARTY_TAX_MANAGE = "accounting:taxes:manage";

function partiesParams(query: ListPartiesQuery): Record<string, unknown> {
  return {
    role: query.role,
    search: query.search ? query.search : undefined,
    includeInactive: query.includeInactive ? "true" : undefined,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export function useParties(query: ListPartiesQuery = {}, options?: QueryOpts<PartyPage>) {
  const canRead = useCan(PARTIES_READ);
  return useQuery<PartyPage, Error>({
    queryKey: accountingArQueryKeys.accountingAr.parties(partiesParams(query)),
    queryFn: ({ signal }) =>
      apiClient.get<PartyPage>("/accounting/parties", partiesParams(query), signal),
    staleTime: STANDARD_LIST_STALE,
    placeholderData: keepPreviousData,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useParty(partyId: string, options?: QueryOpts<PartyDetail>) {
  const canRead = useCan(PARTIES_READ);
  return useQuery<PartyDetail, Error>({
    queryKey: accountingArQueryKeys.accountingAr.party(partyId),
    queryFn: ({ signal }) =>
      apiClient.get<PartyDetail>(`/accounting/parties/${partyId}`, undefined, signal),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!partyId && (options?.enabled ?? true),
  });
}

export function usePartyTaxRegistrations(
  partyId: string,
  options?: QueryOpts<PartyTaxRegistration[]>,
) {
  const canRead = useCan(PARTIES_READ);
  return useQuery<PartyTaxRegistration[], Error>({
    queryKey: accountingArQueryKeys.accountingAr.partyTaxRegistrations(partyId),
    queryFn: ({ signal }) =>
      apiClient.get<PartyTaxRegistration[]>(
        `/accounting/parties/${partyId}/tax-registrations`,
        undefined,
        signal,
      ),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!partyId && (options?.enabled ?? true),
  });
}

export function useCreateParty() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<PartyDetail, Error, CreatePartyInput>("accounting:create", {
    mutationKey: ["accounting", "parties", "create"],
    mutationFn: (input) => apiClient.post<PartyDetail>("/accounting/parties", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useUpdateParty() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<PartyDetail, Error, { partyId: string; input: UpdatePartyInput }>(
    "accounting:update",
    {
      mutationKey: ["accounting", "parties", "update"],
      mutationFn: ({ partyId, input }) =>
        apiClient.patch<PartyDetail>(`/accounting/parties/${partyId}`, input),
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.party(variables.partyId) });
        queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.parties() });
      },
    },
  );
}

export function useDeleteParty() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<DeletedResult, Error, string>("accounting:update", {
    mutationKey: ["accounting", "parties", "delete"],
    mutationFn: (partyId) => apiClient.delete<DeletedResult>(`/accounting/parties/${partyId}`),
    onSuccess: (_data, partyId) => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.party(partyId) });
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.parties() });
    },
  });
}

export function useAddPartyTaxRegistration() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    PartyTaxRegistration,
    Error,
    { partyId: string; input: CreatePartyTaxRegistrationInput }
  >("accounting:taxes:manage", {
    mutationKey: ["accounting", "parties", "taxRegistrations", "add"],
    mutationFn: ({ partyId, input }) =>
      apiClient.post<PartyTaxRegistration>(
        `/accounting/parties/${partyId}/tax-registrations`,
        input,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: accountingArQueryKeys.accountingAr.partyTaxRegistrations(variables.partyId),
      });
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.party(variables.partyId) });
    },
  });
}

export function useRemovePartyTaxRegistration() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<DeletedResult, Error, { partyId: string; registrationId: string }>(
    "accounting:taxes:manage",
    {
      mutationKey: ["accounting", "parties", "taxRegistrations", "remove"],
      mutationFn: ({ partyId, registrationId }) =>
        apiClient.delete<DeletedResult>(
          `/accounting/parties/${partyId}/tax-registrations/${registrationId}`,
        ),
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: accountingArQueryKeys.accountingAr.partyTaxRegistrations(variables.partyId),
        });
        queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.party(variables.partyId) });
      },
    },
  );
}
