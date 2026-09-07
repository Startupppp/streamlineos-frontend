"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

const geofenceListLazy = lazyContract(() =>
  import("@/hooks/api/hr/geofencing-schema").then((m) => m.geofenceListContract),
);
const geofenceRowLazy = lazyContract(() =>
  import("@/hooks/api/hr/geofencing-schema").then((m) => m.geofenceRowContract),
);

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
    queryKey: [...humanResourcesQueryKeys.hr.all, "geofences"],
    queryFn: ({ signal }) => apiClient.get<Geofence[]>("/hr/geofencing", undefined, signal, geofenceListLazy),
    staleTime: 5 * 60_000,
    enabled: hrEnabled && canView,
  });
}

export function useCreateGeofence() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "geofencing", "create"],
    mutationFn: (data: { name: string; lat: string; lng: string; radiusMeters?: number }) =>
      apiClient.post<Geofence>("/hr/geofencing", data, undefined, geofenceRowLazy),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "geofences"] }),
  });
}

export function useUpdateGeofence() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "geofencing", "update"],
    mutationFn: ({ id, ...data }: { id: number; name?: string; lat?: string; lng?: string; radiusMeters?: number }) =>
      apiClient.patch<Geofence>(`/hr/geofencing/${id}`, data, undefined, geofenceRowLazy),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "geofences"] }),
  });
}

export function useDeleteGeofence() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "geofencing", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/geofencing/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "geofences"] }),
  });
}
