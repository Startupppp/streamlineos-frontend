"use client";

import { useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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
  MergeContactsInput,
  DuplicateContactPair,
} from "@/types/crm";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
      apiClient.delete<{ success: boolean }>(`/contacts/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useContactRoles(contactId: number, params?: { entityType?: string; entityId?: number }) {
  return useGatedQuery("crm:contacts:view", {
    queryKey: queryKeys.contactRoles.list(contactId, params as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<ContactRole[]>(`/contacts/${contactId}/roles`, params as Record<string, unknown>, signal),
    staleTime: 2 * 60_000,
    enabled: contactId > 0,
  });
}

export function useAddContactRole() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:contacts:manage", {
    mutationKey: ["contactRoles", "add"] as const,
    mutationFn: ({ contactId, input }: { contactId: number; input: ContactRoleCreateInput }) =>
      apiClient.post<ContactRole>(`/contacts/${contactId}/roles`, input),
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
      apiClient.delete<{ success: boolean }>(`/contacts/${contactId}/roles/${roleId}`),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.contactRoles.list(variables.contactId) });
    },
  });
}

export function useContactDuplicates(params?: { page?: number; limit?: number }) {
  return useGatedQuery("crm:contacts:view", {
    queryKey: queryKeys.contactDuplicates.list(params as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<DuplicateContactPair[]>("/contacts/duplicates", params as Record<string, unknown>, signal),
    staleTime: 5 * 60_000,
  });
}

export function useMergeContacts() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:contacts:merge", {
    mutationKey: ["contacts", "merge"] as const,
    mutationFn: (input: MergeContactsInput) =>
      apiClient.post<{ success: boolean; primaryId: number; mergedId: number }>("/contacts/merge", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
      void qc.invalidateQueries({ queryKey: queryKeys.contactDuplicates.all });
    },
  });
}

export function useExportContacts() {
  return useAuthorizedMutation("crm:contacts:view", {
    mutationKey: ["contacts", "export"] as const,
    mutationFn: () => apiClient.download("/contacts/export"),
  });
}
