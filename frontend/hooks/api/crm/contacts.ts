"use client";

import { useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  ContactDetail,
  ContactRecord,
  PaginatedContacts,
  ContactFilters,
  CreateContactInput,
  UpdateContactInput,
  ContactRole,
  ContactRoleCreateInput,
} from "@/types/crm";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const contactListLazy = lazyContract(() =>
  import("@/hooks/api/crm/contacts-schema").then((m) => m.contactListContract),
);
const contactDetailLazy = lazyContract(() =>
  import("@/hooks/api/crm/contacts-schema").then((m) => m.contactDetailContract),
);
const contactRecordLazy = lazyContract(() =>
  import("@/hooks/api/crm/contacts-schema").then((m) => m.contactRecordContract),
);
const contactRolesLazy = lazyContract(() =>
  import("@/hooks/api/crm/contacts-schema").then((m) => m.contactRolesListContract),
);
const contactRoleLazy = lazyContract(() =>
  import("@/hooks/api/crm/contacts-schema").then((m) => m.contactRoleContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export function useContacts(filters?: ContactFilters) {
  return useGatedQuery("crm:contacts:view", {
    queryKey: queryKeys.contacts.list(filters),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedContacts>("/contacts", filters, signal, contactListLazy),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useContactDetail(id: number) {
  return useGatedQuery("crm:contacts:view", {
    queryKey: queryKeys.contacts.detail(id),
    queryFn: ({ signal }) =>
      apiClient.get<ContactDetail>(`/contacts/${id}`, undefined, signal, contactDetailLazy),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:contacts:manage", {
    mutationKey: ["contacts", "create"] as const,
    mutationFn: (input: CreateContactInput) =>
      apiClient.post<ContactRecord>("/contacts", input, undefined, contactRecordLazy),
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
      apiClient.patch<ContactRecord>(`/contacts/${input.id}`, input, undefined, contactRecordLazy),
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
      apiClient.delete<void>(`/contacts/${id}`, undefined, undefined, noContentLazy),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useContactRoles(contactId: number, params?: { entityType?: string; entityId?: number }) {
  return useGatedQuery("crm:contacts:view", {
    queryKey: queryKeys.contactRoles.list(contactId, params),
    queryFn: ({ signal }) =>
      apiClient.get<ContactRole[]>(`/contacts/${contactId}/roles`, params, signal, contactRolesLazy),
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
      apiClient.delete<void>(`/contacts/${contactId}/roles/${roleId}`, undefined, undefined, noContentLazy),
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
