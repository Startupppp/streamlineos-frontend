"use client";

import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { signalAccessInvalidation, useCan } from "@/hooks/api/access";
import type { AuditCursorPage, ModuleGroupMember, ModuleRoleGroup } from "./types";
import { viewKey } from "./types";
import { lazyContract } from "@/lib/api-envelope";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const roleGroupPageContract = lazyContract(() =>
  import("./module-access-schema").then((m) => m.moduleRoleGroupPageContract),
);
const roleGroupContract = lazyContract(() =>
  import("./module-access-schema").then((m) => m.moduleRoleGroupContract),
);
const groupMembersContract = lazyContract(() =>
  import("./module-access-schema").then((m) => m.moduleGroupMembersContract),
);
const moduleSuccessContract = lazyContract(() =>
  import("./module-access-schema").then((m) => m.moduleSuccessContract),
);

export function useModuleRoleGroups(moduleKey: string) {
  const canView = useCan(viewKey(moduleKey));
  return useInfiniteQuery<AuditCursorPage<ModuleRoleGroup>, Error>({
    ...INLINE_READ_ERROR,
    queryKey: directoryAndOwnershipQueryKeys.moduleAccess.roleGroups(moduleKey),
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: "100" });
      if (typeof pageParam === "string") params.set("cursor", pageParam);
      return apiClient.get(
        `/module-access/${moduleKey}/groups?${params.toString()}`,
        undefined,
        signal,
        roleGroupPageContract,
      );
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: canView,
    staleTime: 2 * 60_000,
  });
}

export function useRenameModuleRoleGroup(moduleKey: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation<ModuleRoleGroup, Error, { id: number; name: string }>({
    mutationKey: ["moduleAccess", moduleKey, "rename-group"],
    mutationFn: ({ id, name }) =>
      apiClient.patch<ModuleRoleGroup>(`/module-access/${moduleKey}/groups/${id}`, { name }, undefined, roleGroupContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
      if (session?.orgId) signalAccessInvalidation(session.orgId);
    },
  });
}

export function useDeleteModuleRoleGroup(moduleKey: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation<{ success: true }, Error, number>({
    mutationKey: ["moduleAccess", moduleKey, "delete-group"],
    mutationFn: (id) =>
      apiClient.delete(`/module-access/${moduleKey}/groups/${id}`, undefined, undefined, moduleSuccessContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
      if (session?.orgId) signalAccessInvalidation(session.orgId);
    },
  });
}

export function useModuleGroupMembers(moduleKey: string, groupId: number | null) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<ModuleGroupMember[], Error>({
    queryKey: directoryAndOwnershipQueryKeys.moduleAccess.groupMembers(moduleKey, groupId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/module-access/${moduleKey}/groups/${groupId}/members`,
        undefined,
        signal,
        groupMembersContract,
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
      apiClient.post(
        `/module-access/${moduleKey}/groups/${groupId}/members`,
        { userId },
        undefined,
        moduleSuccessContract,
      ),
    onSuccess: (_, { groupId, userId }) => {
      void queryClient.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.moduleAccess.groupMembers(moduleKey, groupId),
      });
      void queryClient.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: [...directoryAndOwnershipQueryKeys.moduleAccess.all, moduleKey, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.moduleAccess.memberCandidatesAll(moduleKey),
      });
      if (userId === session?.user?.id) {
        void queryClient.invalidateQueries({
          queryKey: platformCoreQueryKeys.access.me(),
          exact: true,
        });
      }
      if (session?.orgId) signalAccessInvalidation(session.orgId);
    },
  });
}

export function useRemoveModuleGroupMember(moduleKey: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation<{ success: true }, Error, { groupId: number; userId: string }>({
    mutationKey: ["moduleAccess", moduleKey, "remove-member"],
    mutationFn: ({ groupId, userId }) =>
      apiClient.delete(
        `/module-access/${moduleKey}/groups/${groupId}/members/${userId}`,
        undefined,
        undefined,
        moduleSuccessContract,
      ),
    onSuccess: (_, { groupId, userId }) => {
      void queryClient.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.moduleAccess.groupMembers(moduleKey, groupId),
      });
      void queryClient.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: [...directoryAndOwnershipQueryKeys.moduleAccess.all, moduleKey, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.moduleAccess.memberCandidatesAll(moduleKey),
      });
      if (userId === session?.user?.id) {
        void queryClient.invalidateQueries({
          queryKey: platformCoreQueryKeys.access.me(),
          exact: true,
        });
      }
      if (session?.orgId) signalAccessInvalidation(session.orgId);
    },
  });
}

export { viewKey };
