"use client";

import { signalAccessInvalidation, useCan } from "@/hooks/api/access";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";
import {
  userModuleAccessListContract,
  type UserModuleAccessEntry,
} from "@/hooks/api/access/module-status-schema";

export type { UserModuleAccessEntry as UserModuleAccess } from "@/hooks/api/access/module-status-schema";

const userModuleAccessKey = (userId: string) =>
  [...queryKeyBase, "access", "user-module-access", userId] as const;

export function useUserModuleAccess(userId: string, enabled = true) {
  const canViewEmployees = useCan("settings:view");
  return useQuery<UserModuleAccessEntry[]>({
    queryKey: userModuleAccessKey(userId),
    queryFn: ({ signal }) =>
      apiClient.get(`/access/user-module-access/${userId}`, undefined, signal, userModuleAccessListContract),
    staleTime: 30_000,
    enabled: canViewEmployees && enabled && !!userId,
  });
}

export function useSetUserModuleAccess(userId: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useAuthorizedMutation("settings:organization:manage", {
    mutationKey: ["access", "user-module-access", "set", userId],
    mutationFn: (variables: { moduleKey: string; enabled: boolean }) =>
      apiClient.patch<UserModuleAccessEntry[]>(
        `/access/user-module-access/${userId}`,
        variables,
        undefined,
        userModuleAccessListContract,
      ),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: userModuleAccessKey(userId) });
      const previous = queryClient.getQueryData<UserModuleAccessEntry[]>(userModuleAccessKey(userId));
      if (previous) {
        queryClient.setQueryData<UserModuleAccessEntry[]>(userModuleAccessKey(userId), (old) =>
          (old ?? []).map((item) =>
            item.moduleKey === variables.moduleKey
              ? { ...item, enabled: variables.enabled }
              : item,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(userModuleAccessKey(userId), context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(userModuleAccessKey(userId), data);
      if (session?.orgId) signalAccessInvalidation(session.orgId);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userModuleAccessKey(userId) });
    },
  });
}
