"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  HrLocation,
  HrJobRole,
  HrJobLevel,
  HrTeam,
  HrHeadcountGroup,
  OrgCatalogInput,
  LocationInput,
} from "@/types/hr/core";

export function useOrgLocations(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.hr.orgLocations(),
    queryFn: () => apiClient.get<HrLocation[]>("/hr/org/locations"),
    staleTime: 5 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "location", "create"],
    mutationFn: (data: LocationInput) => apiClient.post<HrLocation>("/hr/org/locations", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgLocations() }),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "location", "update"],
    mutationFn: ({ id, ...data }: LocationInput & { id: number }) =>
      apiClient.patch<HrLocation>(`/hr/org/locations/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgLocations() }),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "location", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/org/locations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgLocations() }),
  });
}

export function useOrgJobRoles(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.hr.orgRoles(),
    queryFn: () => apiClient.get<HrJobRole[]>("/hr/org/roles"),
    staleTime: 5 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateJobRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "role", "create"],
    mutationFn: (data: OrgCatalogInput) => apiClient.post<HrJobRole>("/hr/org/roles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgRoles() }),
  });
}

export function useUpdateJobRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "role", "update"],
    mutationFn: ({ id, ...data }: OrgCatalogInput & { id: number }) =>
      apiClient.patch<HrJobRole>(`/hr/org/roles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgRoles() }),
  });
}

export function useDeleteJobRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "role", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/org/roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgRoles() }),
  });
}

export function useOrgJobLevels(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.hr.orgLevels(),
    queryFn: () => apiClient.get<HrJobLevel[]>("/hr/org/levels"),
    staleTime: 5 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateJobLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "level", "create"],
    mutationFn: (data: OrgCatalogInput) => apiClient.post<HrJobLevel>("/hr/org/levels", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgLevels() }),
  });
}

export function useUpdateJobLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "level", "update"],
    mutationFn: ({ id, ...data }: OrgCatalogInput & { id: number }) =>
      apiClient.patch<HrJobLevel>(`/hr/org/levels/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgLevels() }),
  });
}

export function useDeleteJobLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "level", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/org/levels/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgLevels() }),
  });
}

export function useOrgTeams(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.hr.orgTeams(),
    queryFn: () => apiClient.get<HrTeam[]>("/hr/org/teams"),
    staleTime: 5 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "team", "create"],
    mutationFn: (data: OrgCatalogInput) => apiClient.post<HrTeam>("/hr/org/teams", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgTeams() }),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "team", "update"],
    mutationFn: ({ id, ...data }: OrgCatalogInput & { id: number }) =>
      apiClient.patch<HrTeam>(`/hr/org/teams/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgTeams() }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "team", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/org/teams/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgTeams() }),
  });
}

export function useOrgHeadcount(groupBy: "department" | "location" | "role" = "department") {
  return useQuery({
    queryKey: queryKeys.hr.orgHeadcount(groupBy),
    queryFn: () => apiClient.get<HrHeadcountGroup[]>("/hr/org/headcount", { groupBy }),
    staleTime: 5 * 60_000,
  });
}
