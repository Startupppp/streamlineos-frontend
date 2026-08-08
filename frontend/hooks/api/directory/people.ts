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

function isPeoplePage(value: unknown): value is PeoplePage {
  if (typeof value !== "object" || value === null) return false;
  if (!("data" in value) || !("pagination" in value)) return false;
  return (
    Array.isArray(value.data) &&
    typeof value.pagination === "object" &&
    value.pagination !== null
  );
}

export function usePerson(
  organizationPersonId: string,
  options?: { enabled?: boolean },
) {
  const canView = useCan("directory:people:view");
  return useQuery({
    queryKey: queryKeys.directory.person(organizationPersonId),
    queryFn: () =>
      apiClient.get<OrganizationPerson>(`/directory/people/${organizationPersonId}`),
    staleTime: 60_000,
    enabled: canView && !!organizationPersonId && (options?.enabled ?? true),
  });
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

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["directory", "people", "create"],
    mutationFn: (input: CreatePersonInput) =>
      apiClient.post<OrganizationPerson>("/directory/people", input),
    onSuccess: (created) => {
      qc.setQueryData(
        queryKeys.directory.person(created.organizationPersonId),
        created,
      );
      qc.invalidateQueries({ queryKey: queryKeys.directory.peopleAll });
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
    onSuccess: (updated, variables) => {
      qc.setQueryData<OrganizationPerson>(
        queryKeys.directory.person(variables.organizationPersonId),
        (old) => (old ? { ...old, ...updated } : updated),
      );
      qc.setQueriesData(
        { queryKey: queryKeys.directory.peopleAll },
        (old: unknown) => {
          if (!isPeoplePage(old)) return old;
          if (
            !old.data.some(
              (p) => p.organizationPersonId === variables.organizationPersonId,
            )
          )
            return old;
          return {
            ...old,
            data: old.data.map((p) =>
              p.organizationPersonId === variables.organizationPersonId
                ? { ...p, ...updated }
                : p,
            ),
          };
        },
      );
    },
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["directory", "people", "delete"],
    mutationFn: (organizationPersonId: string) =>
      apiClient.delete(`/directory/people/${organizationPersonId}`),
    onSuccess: (_, organizationPersonId) => {
      qc.setQueriesData(
        { queryKey: queryKeys.directory.peopleAll },
        (old: unknown) => {
          if (!isPeoplePage(old)) return old;
          if (
            !old.data.some(
              (p) => p.organizationPersonId === organizationPersonId,
            )
          )
            return old;
          const total = Math.max(0, old.pagination.total - 1);
          return {
            ...old,
            data: old.data.filter(
              (p) => p.organizationPersonId !== organizationPersonId,
            ),
            pagination: {
              ...old.pagination,
              total,
              totalPages: Math.max(1, Math.ceil(total / old.pagination.limit)),
            },
          };
        },
      );
      qc.removeQueries({
        queryKey: queryKeys.directory.person(organizationPersonId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.directory.peopleAll,
        refetchType: "none",
      });
    },
  });
}
