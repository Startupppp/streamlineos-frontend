"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

export interface Geofence {
  id: number;
  name: string;
  lat: string;
  lng: string;
  radiusMeters: number;
  isActive: boolean;
}

export function useGeofences() {
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...queryKeys.hr.all, "geofences"],
    queryFn: ({ signal }) => apiClient.get<Geofence[]>("/hr/geofencing", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: hrEnabled && canView,
  });
}

export function useCreateGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "geofencing", "create"],
    mutationFn: (data: { name: string; lat: string; lng: string; radiusMeters?: number }) =>
      apiClient.post<Geofence>("/hr/geofencing", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "geofences"] }),
  });
}

export function useUpdateGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "geofencing", "update"],
    mutationFn: ({ id, ...data }: { id: number; name?: string; lat?: string; lng?: string; radiusMeters?: number }) =>
      apiClient.patch<Geofence>(`/hr/geofencing/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "geofences"] }),
  });
}

export function useDeleteGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "geofencing", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/geofencing/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "geofences"] }),
  });
}
