"use client";

import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { AuditCursorPage, DataScope, ModuleGroupMember, ModuleRoleGroup } from "./types";
import { viewKey } from "./types";

export function useModuleRoleGroups(moduleKey: string) {
  const canView = useCan(viewKey(moduleKey));
  return useInfiniteQuery<AuditCursorPage<ModuleRoleGroup>, Error>({
    queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "100" });
      if (typeof pageParam === "string") params.set("cursor", pageParam);
      return apiClient.get<AuditCursorPage<ModuleRoleGroup>>(
        `/module-access/${moduleKey}/groups?${params.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: canView,
    staleTime: 2 * 60_000,
  });
}

export function useCreateModuleRoleGroup(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<ModuleRoleGroup, Error, { name: string }>({
    mutationKey: ["moduleAccess", moduleKey, "create-group"],
    mutationFn: (body) =>
      apiClient.post<ModuleRoleGroup>(`/module-access/${moduleKey}/groups`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
    },
  });
}

export function useRenameModuleRoleGroup(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<ModuleRoleGroup, Error, { id: number; name: string }>({
    mutationKey: ["moduleAccess", moduleKey, "rename-group"],
    mutationFn: ({ id, name }) =>
      apiClient.patch<ModuleRoleGroup>(`/module-access/${moduleKey}/groups/${id}`, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
    },
  });
}

export function useDeleteModuleRoleGroup(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, Error, number>({
    mutationKey: ["moduleAccess", moduleKey, "delete-group"],
    mutationFn: (id) =>
      apiClient.delete<{ success: true }>(`/module-access/${moduleKey}/groups/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
    },
  });
}

export function useSetModuleGroupPermissions(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: true; version: number },
    Error,
    { groupId: number; version: number; items: { permissionKey: string; scope: DataScope }[] }
  >({
    mutationKey: ["moduleAccess", moduleKey, "set-group-permissions"],
    mutationFn: ({ groupId, version, items }) =>
      apiClient.put<{ success: true; version: number }>(
        `/module-access/${moduleKey}/groups/${groupId}/permissions`,
        { version, items },
      ),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<InfiniteData<AuditCursorPage<ModuleRoleGroup>>>(
        queryKeys.moduleAccess.roleGroups(moduleKey),
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  data: page.data.map((g) =>
                    g.id === variables.groupId ? { ...g, version: data.version } : g,
                  ),
                })),
              }
            : old,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.access.me(),
        exact: true,
      });
    },
  });
}

export function useModuleGroupMembers(moduleKey: string, groupId: number | null) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<ModuleGroupMember[], Error>({
    queryKey: queryKeys.moduleAccess.groupMembers(moduleKey, groupId ?? 0),
    queryFn: () =>
      apiClient.get<ModuleGroupMember[]>(
        `/module-access/${moduleKey}/groups/${groupId}/members`,
      ),
    enabled: canView && groupId !== null,
    staleTime: 2 * 60_000,
  });
}

export function useAddModuleGroupMember(moduleKey: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation<{ success: true }, Error, { groupId: number; userId: string }>({
    mutationKey: ["moduleAccess", moduleKey, "add-member"],
    mutationFn: ({ groupId, userId }) =>
      apiClient.post<{ success: true }>(
        `/module-access/${moduleKey}/groups/${groupId}/members`,
        { userId },
      ),
    onSuccess: (_, { groupId, userId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.groupMembers(moduleKey, groupId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.moduleAccess.all, moduleKey, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.memberCandidatesAll(moduleKey),
      });
      if (userId === session?.user?.id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.access.me(),
          exact: true,
        });
      }
    },
  });
}

export function useRemoveModuleGroupMember(moduleKey: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation<{ success: true }, Error, { groupId: number; userId: string }>({
    mutationKey: ["moduleAccess", moduleKey, "remove-member"],
    mutationFn: ({ groupId, userId }) =>
      apiClient.delete<{ success: true }>(
        `/module-access/${moduleKey}/groups/${groupId}/members/${userId}`,
      ),
    onSuccess: (_, { groupId, userId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.groupMembers(moduleKey, groupId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.moduleAccess.all, moduleKey, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.memberCandidatesAll(moduleKey),
      });
      if (userId === session?.user?.id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.access.me(),
          exact: true,
        });
      }
    },
  });
}

export { viewKey };
