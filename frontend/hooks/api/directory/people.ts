"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  organizationPersonContract,
  peoplePageContract,
  type OrganizationPerson,
  type PeoplePage,
} from "@/hooks/api/directory/people-schema";
import type {
  CreatePersonInput,
  UpdatePersonInput,
} from "@/types/directory/people";

export interface UsePeopleParams {
  cursor?: string;
  limit?: number;
  search?: string;
}

function isPeoplePage(value: unknown): value is PeoplePage {
  if (typeof value !== "object" || value === null) return false;
  if (!("data" in value) || !("pageInfo" in value)) return false;
  return (
    Array.isArray(value.data) &&
    typeof value.pageInfo === "object" &&
    value.pageInfo !== null
  );
}

export function usePerson(
  organizationPersonId: string,
  options?: { enabled?: boolean },
) {
  const canView = useCan("directory:people:view");
  return useQuery({
    queryKey: queryKeys.directory.person(organizationPersonId),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/directory/people/${organizationPersonId}`,
        undefined,
        signal,
        organizationPersonContract,
      ),
    staleTime: 60_000,
    enabled: canView && !!organizationPersonId && (options?.enabled ?? true),
  });
}

export function usePeople(params: UsePeopleParams = {}) {
  const canView = useCan("directory:people:view");
  const { cursor, limit = 20, search } = params;
  const queryParams: Record<string, unknown> = { cursor, limit };
  if (search) queryParams.search = search;

  return useQuery({
    queryKey: queryKeys.directory.people(queryParams),
    queryFn: ({ signal }) => {
      const searchParams = new URLSearchParams({
        limit: String(limit),
      });
      if (cursor) searchParams.set("cursor", cursor);
      if (search) searchParams.set("search", search);
      return apiClient.get(
        `/directory/people?${searchParams.toString()}`,
        undefined,
        signal,
        peoplePageContract,
      );
    },
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useAuthorizedMutation("directory:people:create", {
    mutationKey: ["directory", "people", "create"],
    mutationFn: (input: CreatePersonInput) =>
      apiClient.post("/directory/people", input, undefined, organizationPersonContract),
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
  return useAuthorizedMutation("directory:people:update", {
    mutationKey: ["directory", "people", "update"],
    mutationFn: ({
      organizationPersonId,
      ...input
    }: UpdatePersonInput & { organizationPersonId: string }) =>
      apiClient.patch(
        `/directory/people/${organizationPersonId}`,
        input,
        undefined,
        organizationPersonContract,
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
  return useAuthorizedMutation("directory:people:delete", {
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
          return {
            ...old,
            data: old.data.filter(
              (p) => p.organizationPersonId !== organizationPersonId,
            ),
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
