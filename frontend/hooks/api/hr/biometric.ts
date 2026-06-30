"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface BiometricDevice {
  id: number;
  name: string;
  ipAddress: string;
  port: number;
  vendor: string;
  location: string | null;
  isOnline: boolean;
  lastSyncAt: string | null;
}

export interface BiometricLog {
  id: number;
  deviceId: number;
  userId: string | null;
  punchTime: string;
  punchType: string;
  processed: boolean;
}

export function useBiometricDevices() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "biometricDevices"],
    queryFn: () => apiClient.get<BiometricDevice[]>("/hr/biometric/devices"),
    staleTime: 5 * 60_000,
  });
}

export function useCreateBiometricDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "biometric", "createDevice"],
    mutationFn: (data: { name: string; ipAddress: string; port?: number; vendor?: string; location?: string }) =>
      apiClient.post<BiometricDevice>("/hr/biometric/devices", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "biometricDevices"] }),
  });
}

export function useUpdateBiometricDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "biometric", "updateDevice"],
    mutationFn: ({ id, ...data }: { id: number; name?: string; ipAddress?: string; port?: number; vendor?: string; location?: string }) =>
      apiClient.patch<BiometricDevice>(`/hr/biometric/devices/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "biometricDevices"] }),
  });
}

export function useBiometricLogs() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "biometricLogs"],
    queryFn: () => apiClient.get<BiometricLog[]>("/hr/biometric/logs"),
    staleTime: 30_000,
  });
}
