"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";

interface LoginHistoryEntry {
  id: string;
  userId: string;
  orgId: string | null;
  event: string;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string;
  os: string | null;
  platform: string | null;
  success: boolean;
  failureReason: string | null;
  createdAt: string;
}

interface LoginHistoryPage {
  data: LoginHistoryEntry[];
  total: number;
  page: number;
  limit: number;
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["me", "profile", "update"],
    mutationFn: (data: { name?: string; image?: string }) =>
      apiClient.patch<{ success: true }>("/me/profile", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.employees() });
      void qc.invalidateQueries({ queryKey: platformCoreQueryKeys.organization.members() });
    },
  });
}

export function useLoginHistory(params?: { page?: number; limit?: number; success?: boolean }) {
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.auth.loginHistory(params as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<LoginHistoryPage>("/me/login-history", {
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        ...(params?.success !== undefined && { success: String(params.success) }),
      }, signal),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

