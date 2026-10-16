"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { PartyContact } from "@/hooks/api/party/party-schema";

const listLazy = lazyContract(() =>
  import("@/hooks/api/party/party-schema").then((m) => m.partyContactListContract),
);
const contactLazy = lazyContract(() =>
  import("@/hooks/api/party/party-schema").then((m) => m.partyContactContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

/** The writable fields of `createContactSchema` / `updateContactSchema`. */
export interface PartyContactInput {
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
}

export function usePartyContacts(partyId: string | null) {
  return useGatedQuery("party:contacts:view", {
    queryKey: directoryAndOwnershipQueryKeys.party.contacts(partyId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<PartyContact[]>(`/party/parties/${partyId}/contacts`, undefined, signal, listLazy),
    staleTime: 60_000,
    enabled: !!partyId,
  });
}

/** Create omits nulls (the create schema takes `optional`, not `nullable`). */
function forCreate(input: PartyContactInput) {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== null));
}

export function useSavePartyContact(partyId: string) {
  const qc = useQueryClient();
  const key = directoryAndOwnershipQueryKeys.party.contacts(partyId);
  return useAuthorizedMutation("party:contacts:manage", {
    mutationKey: ["party", "contacts", "save"] as const,
    mutationFn: ({ partyContactId, input }: { partyContactId?: string; input: PartyContactInput }) =>
      partyContactId
        ? apiClient.patch<PartyContact>(`/party/contacts/${partyContactId}`, input, undefined, contactLazy)
        : apiClient.post<PartyContact>(`/party/parties/${partyId}/contacts`, { ...forCreate(input), partyId }, undefined, contactLazy),
    onSuccess: (saved) => {
      qc.setQueryData<PartyContact[]>(key, (prev) => {
        if (!prev) return prev;
        const exists = prev.some((c) => c.partyContactId === saved.partyContactId);
        return exists ? prev.map((c) => (c.partyContactId === saved.partyContactId ? saved : c)) : [...prev, saved];
      });
    },
  });
}

export function useDeletePartyContact(partyId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("party:contacts:manage", {
    mutationKey: ["party", "contacts", "delete"] as const,
    mutationFn: (partyContactId: string) =>
      apiClient.delete<void>(`/party/contacts/${partyContactId}`, undefined, undefined, noContentLazy),
    onSuccess: (_, partyContactId) => {
      qc.setQueryData<PartyContact[]>(directoryAndOwnershipQueryKeys.party.contacts(partyId), (prev) =>
        prev?.filter((c) => c.partyContactId !== partyContactId),
      );
    },
  });
}
