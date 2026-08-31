"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";

export interface TerritoryCriteria {
  countries?: string[];
  states?: string[];
  cities?: string[];
  postalCodes?: string[];
  industries?: string[];
  companySizes?: string[];
  productKeys?: string[];
  accountTypes?: string[];
}

export interface Territory {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  states: string[];
  cities: string[];
  assignedReps: number[];
  criteria: TerritoryCriteria;
  priority: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CreateTerritoryInput {
  name: string;
  description?: string;
  criteria?: TerritoryCriteria;
  priority?: number;
  isActive?: boolean;
  assignedReps?: number[];
}

interface UpdateTerritoryInput {
  id: number;
  name?: string;
  description?: string | null;
  criteria?: TerritoryCriteria;
  priority?: number;
  isActive?: boolean;
  assignedReps?: number[];
}

export interface TerritoryPreviewResult {
  matchedTerritory: Territory | null;
  /** Raw `crmPersonId` values — for logic only. Render `assignedRepNames` (§15). */
  assignedReps: number[];
  assignedRepNames: string[];
}

export function useTerritories() {
  return useGatedQuery("crm:territories:manage", {
    queryKey: queryKeys.crmSettings.territories(),
    queryFn: () => apiClient.get<Territory[]>("/crm/territories"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "territories", "create"],
    mutationFn: (input: CreateTerritoryInput) =>
      apiClient.post<Territory>("/crm/territories", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.territories() });
    },
  });
}

export function useUpdateTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "territories", "update"],
    mutationFn: ({ id, ...data }: UpdateTerritoryInput) =>
      apiClient.patch<Territory>(`/crm/territories/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.territories() });
    },
  });
}

export function useDeleteTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "territories", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/territories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.territories() });
    },
  });
}

export function usePreviewTerritory() {
  return useMutation({
    mutationKey: ["crm-settings", "territories", "preview"],
    mutationFn: (sampleLead: {
      city?: string;
      state?: string;
      country?: string;
      industry?: string;
    }) =>
      apiClient.post<TerritoryPreviewResult>("/crm/territories/preview", { sample: sampleLead }),
  });
}
