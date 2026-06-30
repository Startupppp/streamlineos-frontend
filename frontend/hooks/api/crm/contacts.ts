"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Contact,
  PaginatedContacts,
  ContactFilters,
  CreateContactInput,
  UpdateContactInput,
} from "@/types/crm";

export function useContacts(filters?: ContactFilters) {
  return useQuery({
    queryKey: queryKeys.contacts.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedContacts>("/contacts", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useContactDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(id),
    queryFn: () => apiClient.get<Contact>(`/contacts/${id}`),
    enabled: id > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
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
  return useMutation({
    mutationKey: ["contacts", "update"] as const,
    mutationFn: (input: UpdateContactInput) =>
      apiClient.patch<Contact>(`/contacts/${input.id}`, input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
      void qc.invalidateQueries({
        queryKey: queryKeys.contacts.detail(variables.id),
      });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["contacts", "delete"] as const,
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/contacts/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}
