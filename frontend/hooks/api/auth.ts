"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface DeviceData {
  id: string;
  userId: string;
  fingerprint: string;
  browser: string | null;
  os: string | null;
  platform: string | null;
  trusted: boolean;
  lastSeenAt: string;
  createdAt: string;
}

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

export function useDevices() {
  return useQuery({
    queryKey: queryKeys.auth.devices(),
    queryFn: () => apiClient.get<DeviceData[]>("/me/devices"),
    staleTime: 60_000,
  });
}

export function useTrustDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) =>
      apiClient.post<{ message: string }>(`/me/devices/${deviceId}/trust`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auth.devices() }),
  });
}

export function useRemoveDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) =>
      apiClient.delete<{ message: string }>(`/me/devices/${deviceId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auth.devices() }),
  });
}

export function useLoginHistory(params?: { page?: number; success?: boolean }) {
  return useQuery({
    queryKey: queryKeys.auth.loginHistory(params as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<LoginHistoryPage>("/me/login-history", {
        page: params?.page ?? 1,
        limit: 20,
        ...(params?.success !== undefined && { success: String(params.success) }),
      }),
    staleTime: 30_000,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationKey: ["auth", "change-password"],
    mutationFn: (data: { currentPassword?: string; newPassword: string }) =>
      apiClient.patch<{ message: string }>("/me/change-password", data),
  });
}
