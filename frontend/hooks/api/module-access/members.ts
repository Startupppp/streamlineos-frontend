"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { CursorPaginatedResult, DataScope, MemberGrant, ModuleMember, ModuleMemberCandidate } from "./types";
import { viewKey, manageKey } from "./types";

export function useModuleMembersInfinite(
  moduleKey: string,
  pageSize: number,
  options?: { enabled?: boolean; userId?: string },
) {
  const canView = useCan(viewKey(moduleKey));
  const userId = options?.userId;
  return useInfiniteQuery<CursorPaginatedResult<ModuleMember>, Error>({
    queryKey: queryKeys.moduleAccess.members(moduleKey, { pageSize, userId }),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ pageSize: String(pageSize) });
      if (typeof pageParam === "number") params.set("cursor", String(pageParam));
      if (userId !== undefined) params.set("userId", userId);
      return apiClient.get<CursorPaginatedResult<ModuleMember>>(
        `/module-access/${moduleKey}/members?${params.toString()}`,
      );
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: canView && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useAddModuleMember(moduleKey: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation<{ success: true }, Error, { userId: string; groupIds: number[] }>({
    mutationKey: ["moduleAccess", moduleKey, "add-module-member"],
    mutationFn: (body) =>
      apiClient.post<{ success: true }>(`/module-access/${moduleKey}/members`, body),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.moduleAccess.all, moduleKey, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
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

export function useUpdateModuleMember(moduleKey: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation<{ success: true }, Error, { userId: string; groupIds: number[] }>({
    mutationKey: ["moduleAccess", moduleKey, "update-module-member"],
    mutationFn: ({ userId, groupIds }) =>
      apiClient.patch<{ success: true }>(
        `/module-access/${moduleKey}/members/${userId}`,
        { groupIds },
      ),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.moduleAccess.all, moduleKey, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
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

export function useRemoveModuleMember(moduleKey: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation<{ success: true }, Error, { userId: string }>({
    mutationKey: ["moduleAccess", moduleKey, "remove-module-member"],
    mutationFn: ({ userId }) =>
      apiClient.delete<{ success: true }>(`/module-access/${moduleKey}/members/${userId}`),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.moduleAccess.all, moduleKey, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.roleGroups(moduleKey),
        exact: true,
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

export function useModuleMemberCandidates(
  moduleKey: string,
  pageSize: number,
  search: string,
  options?: { enabled?: boolean; userId?: string; excludeAssigned?: boolean },
) {
  const canManage = useCan(manageKey(moduleKey));
  const userId = options?.userId;
  const excludeAssigned = options?.excludeAssigned ?? true;
  return useQuery<CursorPaginatedResult<ModuleMemberCandidate>, Error>({
    queryKey: queryKeys.moduleAccess.memberCandidates(moduleKey, {
      pageSize,
      search,
      userId,
      excludeAssigned,
    }),
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: String(pageSize) });
      if (search) params.set("search", search);
      if (userId) params.set("userId", userId);
      params.set("excludeAssigned", String(excludeAssigned));
      return apiClient.get<CursorPaginatedResult<ModuleMemberCandidate>>(
        `/module-access/${moduleKey}/member-candidates?${params.toString()}`,
      );
    },
    enabled: canManage && (options?.enabled ?? true),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useModuleMemberGrants(
  moduleKey: string,
  membershipId: number | null,
  options?: { enabled?: boolean },
) {
  const canManage = useCan(manageKey(moduleKey));
  return useQuery<{ grants: MemberGrant[] }, Error>({
    queryKey: queryKeys.moduleAccess.memberGrants(moduleKey, membershipId ?? 0),
    queryFn: () =>
      apiClient.get<{ grants: MemberGrant[] }>(
        `/module-access/${moduleKey}/members/${membershipId}/grants`,
      ),
    enabled: canManage && membershipId !== null && (options?.enabled ?? true),
    staleTime: 30_000,
  });
}

export function useSetModuleMemberGrants(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: true; granted: number },
    Error,
    {
      membershipId: number;
      items: { permissionKey: string; scope?: DataScope }[];
      reason?: string;
    }
  >({
    mutationKey: ["moduleAccess", moduleKey, "set-member-grants"],
    mutationFn: ({ membershipId, items, reason }) =>
      apiClient.put<{ success: true; granted: number }>(
        `/module-access/${moduleKey}/members/${membershipId}/grants`,
        { items, reason },
      ),
    onSuccess: (_, { membershipId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.memberGrants(moduleKey, membershipId),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.moduleAccess.all, moduleKey, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.access.me(),
      });
    },
  });
}
