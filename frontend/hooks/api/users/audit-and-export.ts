"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { AuditResponse } from "./types";

export const useUserAuditLog = (
  userId: string,
  params?: { page?: number; limit?: number; from?: string; to?: string },
  options?: Omit<UseQueryOptions<AuditResponse, Error>, "queryKey" | "queryFn">,
) => {
  const canManage = useCan("settings:organization:manage");
  return useQuery<AuditResponse, Error>({
    queryKey: [...queryKeys.users.detail(userId), "audit", params] as readonly unknown[],
    queryFn: () =>
      apiClient.get<AuditResponse>(`/users/${userId}/audit`, {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.from ? { from: params.from } : {}),
        ...(params?.to ? { to: params.to } : {}),
      }),
    staleTime: 30_000,
    ...options,
    enabled: !!userId && canManage && (options?.enabled ?? true),
  });
};

export const useExportUsers = () => {
  return useMutation<void, Error, void>({
    mutationKey: ["export", "users"],
    mutationFn: async () => {
      const csv = await apiClient.get<string>("/users/export");
      const blob = new Blob([csv], { type: "text/csv" });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement("a");
      downloadAnchor.href = downloadUrl;
      downloadAnchor.download = "users.csv";
      downloadAnchor.click();
      URL.revokeObjectURL(downloadUrl);
    },
  });
};
