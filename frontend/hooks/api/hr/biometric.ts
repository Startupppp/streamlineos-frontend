"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

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
  const canManage = useCan("hr:attendance:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...queryKeys.hr.all, "biometricDevices"],
    queryFn: ({ signal }) => apiClient.get<BiometricDevice[]>("/hr/biometric/devices", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: hrEnabled && canManage,
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
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...queryKeys.hr.all, "biometricLogs"],
    queryFn: ({ signal }) => apiClient.get<BiometricLog[]>("/hr/biometric/logs", undefined, signal),
    staleTime: 30_000,
    enabled: hrEnabled && canView,
  });
}
