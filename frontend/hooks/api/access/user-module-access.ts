"use client";

import { useCan } from "@/hooks/api/access";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface UserModuleAccess {
  moduleKey: string;
  enabled: boolean;
  core: boolean;
}

const userModuleAccessKey = (userId: string) =>
  ["streamlineos", "access", "user-module-access", userId] as const;

export function useUserModuleAccess(userId: string, enabled = true) {
  const canViewEmployees = useCan("settings:view");
  return useQuery<UserModuleAccess[]>({
    queryKey: userModuleAccessKey(userId),
    queryFn: () =>
      apiClient.get<UserModuleAccess[]>(`/access/user-module-access/${userId}`),
    staleTime: 30_000,
    enabled: canViewEmployees && enabled && !!userId,
  });
}

export function useSetUserModuleAccess(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["access", "user-module-access", "set", userId],
    mutationFn: (variables: { moduleKey: string; enabled: boolean }) =>
      apiClient.patch<UserModuleAccess[]>(
        `/access/user-module-access/${userId}`,
        variables,
      ),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: userModuleAccessKey(userId) });
      const previous = queryClient.getQueryData<UserModuleAccess[]>(userModuleAccessKey(userId));
      if (previous) {
        queryClient.setQueryData<UserModuleAccess[]>(userModuleAccessKey(userId), (old) =>
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
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userModuleAccessKey(userId) });
    },
  });
}
