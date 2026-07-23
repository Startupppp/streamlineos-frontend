"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface UserModuleAccess {
  moduleKey: string;
  enabled: boolean;
}

const userModuleAccessKey = (userId: string) =>
  ["access", "user-module-access", userId] as const;

export function useUserModuleAccess(userId: string, enabled = true) {
  return useQuery<UserModuleAccess[]>({
    queryKey: userModuleAccessKey(userId),
    queryFn: () =>
      apiClient.get<UserModuleAccess[]>(`/access/user-module-access/${userId}`),
    staleTime: 30_000,
    enabled: enabled && !!userId,
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
    onSuccess: (data) => {
      queryClient.setQueryData(userModuleAccessKey(userId), data);
    },
  });
}
