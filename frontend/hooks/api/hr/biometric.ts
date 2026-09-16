"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

const biometricDeviceListC = lazyContract(() =>
  import("@/hooks/api/hr/biometric-schema").then((m) => m.biometricDeviceListContract),
);
const biometricDeviceC = lazyContract(() =>
  import("@/hooks/api/hr/biometric-schema").then((m) => m.biometricDeviceContract),
);
const biometricLogListC = lazyContract(() =>
  import("@/hooks/api/hr/biometric-schema").then((m) => m.biometricLogListContract),
);

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
    queryKey: [...humanResourcesQueryKeys.hr.all, "biometricDevices"],
    queryFn: ({ signal }) => apiClient.get<BiometricDevice[]>("/hr/biometric/devices", undefined, signal, biometricDeviceListC),
    staleTime: 5 * 60_000,
    enabled: hrEnabled && canManage,
  });
}

export function useCreateBiometricDevice() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "biometric", "createDevice"],
    mutationFn: (data: { name: string; ipAddress: string; port?: number; vendor?: string; location?: string }) =>
      apiClient.post<BiometricDevice>("/hr/biometric/devices", data, undefined, biometricDeviceC),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "biometricDevices"] }),
  });
}

export function useUpdateBiometricDevice() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "biometric", "updateDevice"],
    mutationFn: ({ deviceId, ...data }: { deviceId: number; name?: string; ipAddress?: string; port?: number; vendor?: string; location?: string }) =>
      apiClient.patch<BiometricDevice>(`/hr/biometric/devices/${deviceId}`, data, undefined, biometricDeviceC),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "biometricDevices"] }),
  });
}

export function useBiometricLogs() {
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "biometricLogs"],
    queryFn: ({ signal }) => apiClient.get<BiometricLog[]>("/hr/biometric/logs", undefined, signal, biometricLogListC),
    staleTime: 30_000,
    enabled: hrEnabled && canView,
  });
}
