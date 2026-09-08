"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import type { AuditResponse } from "./types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const userAuditContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then((m) => m.userAuditContract),
);
const usersCsvExportContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then((m) => m.usersCsvExportContract),
);

export const useUserAuditLog = (
  userId: string,
  params?: { cursor?: string; limit?: number; from?: string; to?: string },
  options?: Omit<UseQueryOptions<AuditResponse, Error>, "queryKey" | "queryFn">,
) => {
  const canManage = useCan("settings:organization:manage");
  return useQuery<AuditResponse, Error>({
    queryKey: [...usersAndCommerceQueryKeys.users.detail(userId), "audit", params] as const,
    queryFn: ({ signal }) =>
      apiClient.get<AuditResponse>(`/users/${userId}/audit`, {
        ...(params?.cursor ? { cursor: params.cursor } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.from ? { from: params.from } : {}),
        ...(params?.to ? { to: params.to } : {}),
      }, signal, userAuditContract),
    staleTime: 30_000,
    ...options,
    enabled: !!userId && canManage && (options?.enabled ?? true),
  });
};

export const useExportUsers = () => {
  return useAuthorizedMutation<void, Error, void>("settings:organization:manage", {
    mutationKey: ["export", "users"],
    mutationFn: async () => {
      const csv = await apiClient.get<string>("/users/export", undefined, undefined, usersCsvExportContract);
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
