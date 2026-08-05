"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
      void qc.invalidateQueries({ queryKey: queryKeys.hr.employees() });
    },
  });
}

export function useLoginHistory(params?: { page?: number; limit?: number; success?: boolean }) {
  return useQuery({
    queryKey: queryKeys.auth.loginHistory(params as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<LoginHistoryPage>("/me/login-history", {
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        ...(params?.success !== undefined && { success: String(params.success) }),
      }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

