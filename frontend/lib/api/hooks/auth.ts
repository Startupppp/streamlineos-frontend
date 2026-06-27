"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface AuthAnalytics {
  loginsToday: number;
  failedLoginsLast7Days: number;
  activeSessions: number;
  passwordResetsLast7Days: number;
}

export interface SessionData {
  id: string;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
  deviceId: string | null;
  lastActive: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface DeviceData {
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

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  orgId: string | null;
  event: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  createdAt: string;
}

export interface LoginHistoryPage {
  data: LoginHistoryEntry[];
  total: number;
  page: number;
  limit: number;
}

export function useAuthAnalytics() {
  return useQuery({
    queryKey: queryKeys.auth.auditAnalytics(),
    queryFn: () => apiClient.get<AuthAnalytics>("/auth/audit/analytics"),
    staleTime: 60_000,
  });
}

export function useSessions() {
  return useQuery({
    queryKey: queryKeys.auth.sessions(),
    queryFn: () => apiClient.get<SessionData[]>("/auth/sessions"),
    staleTime: 30_000,
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.delete<{ message: string }>(`/auth/sessions/${sessionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auth.sessions() }),
  });
}

export function useRevokeAllSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete<{ message: string }>("/auth/sessions"),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auth.sessions() }),
  });
}

export function useDevices() {
  return useQuery({
    queryKey: queryKeys.auth.devices(),
    queryFn: () => apiClient.get<DeviceData[]>("/auth/devices"),
    staleTime: 60_000,
  });
}

export function useTrustDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) =>
      apiClient.post<{ message: string }>(`/auth/devices/${deviceId}/trust`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auth.devices() }),
  });
}

export function useRemoveDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) =>
      apiClient.delete<{ message: string }>(`/auth/devices/${deviceId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auth.devices() }),
  });
}

export function useLoginHistory(params?: { page?: number; success?: boolean }) {
  return useQuery({
    queryKey: queryKeys.auth.loginHistory(params as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<LoginHistoryPage>("/auth/login-history", {
        page: params?.page ?? 1,
        limit: 20,
        ...(params?.success !== undefined && { success: String(params.success) }),
      }),
    staleTime: 30_000,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.post<{ message: string }>("/auth/change-password", data),
  });
}
