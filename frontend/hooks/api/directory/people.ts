"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  CreatePersonInput,
  OrganizationPerson,
  PeoplePage,
  UpdatePersonInput,
} from "@/types/directory/people";

export interface UsePeopleParams {
  page?: number;
  limit?: number;
  search?: string;
}

export function usePeople(params: UsePeopleParams = {}) {
  const canView = useCan("directory:people:view");
  const { page = 1, limit = 20, search } = params;
  const queryParams: Record<string, unknown> = { page, limit };
  if (search) queryParams.search = search;

  return useQuery({
    queryKey: queryKeys.directory.people(queryParams),
    queryFn: () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) searchParams.set("search", search);
      return apiClient.get<PeoplePage>(`/directory/people?${searchParams.toString()}`);
    },
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePerson(organizationPersonId: string) {
  const canView = useCan("directory:people:view");
  return useQuery({
    queryKey: queryKeys.directory.person(organizationPersonId),
    queryFn: () =>
      apiClient.get<OrganizationPerson>(`/directory/people/${organizationPersonId}`),
    staleTime: 60_000,
    enabled: canView && !!organizationPersonId,
  });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["directory", "people", "create"],
    mutationFn: (input: CreatePersonInput) =>
      apiClient.post<OrganizationPerson>("/directory/people", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.directory.all });
    },
  });
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["directory", "people", "update"],
    mutationFn: ({
      organizationPersonId,
      ...input
    }: UpdatePersonInput & { organizationPersonId: string }) =>
      apiClient.patch<OrganizationPerson>(
        `/directory/people/${organizationPersonId}`,
        input,
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.directory.person(variables.organizationPersonId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.directory.people() });
    },
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["directory", "people", "delete"],
    mutationFn: (organizationPersonId: string) =>
      apiClient.delete(`/directory/people/${organizationPersonId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.directory.people() });
    },
  });
}
