"use client";

import { useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  Contact,
  PaginatedContacts,
  ContactFilters,
  CreateContactInput,
  UpdateContactInput,
  ContactRole,
  ContactRoleCreateInput,
} from "@/types/crm";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

/*
  No list or detail contract. `contactItemSchema` in contacts-schema.ts describes
  the legacy `contacts` row: it has no `partyId`, which the merge screens read, and
  it requires `ownerId`, `source` and `status`, which the Party projection
  (`contacts-query.ts`) does not return. A contract violation throws, so attaching
  it would take down every contacts read; and stripping `partyId` would silently
  break merging. The roles and delete contracts still match and stay attached.
*/
const contactRolesLazy = lazyContract(() =>
  import("@/hooks/api/crm/contacts-schema").then((m) => m.contactRolesListContract),
);
const contactRoleLazy = lazyContract(() =>
  import("@/hooks/api/crm/contacts-schema").then((m) => m.contactRoleContract),
);
const deleteContactLazy = lazyContract(() =>
  import("@/hooks/api/crm/contacts-schema").then((m) => m.deleteContactContract),
);

export function useContacts(filters?: ContactFilters) {
  return useGatedQuery("crm:contacts:view", {
    queryKey: queryKeys.contacts.list(filters),
    queryFn: ({ signal }) => apiClient.get<PaginatedContacts>("/contacts", filters, signal),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useContactDetail(id: number) {
  return useGatedQuery("crm:contacts:view", {
    queryKey: queryKeys.contacts.detail(id),
    queryFn: ({ signal }) => apiClient.get<Contact>(`/contacts/${id}`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:contacts:manage", {
    mutationKey: ["contacts", "create"] as const,
    mutationFn: (input: CreateContactInput) =>
      apiClient.post<Contact>("/contacts", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:contacts:manage", {
    mutationKey: ["contacts", "update"] as const,
    mutationFn: (input: UpdateContactInput) =>
      apiClient.patch<Contact>(`/contacts/${input.id}`, input),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
      void qc.invalidateQueries({
        queryKey: queryKeys.contacts.detail(variables.id),
      });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:contacts:manage", {
    mutationKey: ["contacts", "delete"] as const,
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/contacts/${id}`, undefined, undefined, deleteContactLazy),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useContactRoles(contactId: number, params?: { entityType?: string; entityId?: number }) {
  return useGatedQuery("crm:contacts:view", {
    queryKey: queryKeys.contactRoles.list(contactId, params as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<ContactRole[]>(`/contacts/${contactId}/roles`, params as Record<string, unknown>, signal, contactRolesLazy),
    staleTime: 2 * 60_000,
    enabled: contactId > 0,
  });
}

export function useAddContactRole() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:contacts:manage", {
    mutationKey: ["contactRoles", "add"] as const,
    mutationFn: ({ contactId, input }: { contactId: number; input: ContactRoleCreateInput }) =>
      apiClient.post<ContactRole>(`/contacts/${contactId}/roles`, input, undefined, contactRoleLazy),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.contactRoles.list(variables.contactId) });
    },
  });
}

export function useRemoveContactRole() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:contacts:manage", {
    mutationKey: ["contactRoles", "remove"] as const,
    mutationFn: ({ contactId, roleId }: { contactId: number; roleId: string }) =>
      apiClient.delete<{ success: boolean }>(`/contacts/${contactId}/roles/${roleId}`, undefined, undefined, deleteContactLazy),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.contactRoles.list(variables.contactId) });
    },
  });
}

export function useExportContacts() {
  return useAuthorizedMutation("crm:contacts:view", {
    mutationKey: ["contacts", "export"] as const,
    mutationFn: () => apiClient.download("/contacts/export"),
  });
}
