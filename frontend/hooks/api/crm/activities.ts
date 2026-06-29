"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Target,
  TargetHistory,
  TargetLeaderboardEntry,
  CreateTargetInput,
} from "@/types/crm";

export interface Territory {
  id: number;
  orgId: string;
  name: string;
  states: string[];
  cities: string[];
  assignedReps: number[];
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTerritoryInput {
  name: string;
  states?: string[];
  cities?: string[];
  assignedReps?: number[];
  description?: string;
  isActive?: boolean;
}

interface UpdateTerritoryInput extends Partial<CreateTerritoryInput> {
  id: number;
}

export interface CustomFieldDefinition {
  id: number;
  orgId: string;
  entityType: "lead" | "deal" | "contact";
  name: string;
  label: string;
  fieldType: "text" | "number" | "date" | "boolean" | "select";
  options: Array<{ value: string; label: string }> | null;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateCustomFieldInput {
  entityType: "lead" | "deal" | "contact";
  name: string;
  label: string;
  fieldType: "text" | "number" | "date" | "boolean" | "select";
  options?: Array<{ value: string; label: string }>;
  isRequired?: boolean;
  sortOrder?: number;
}

interface UpdateCustomFieldInput {
  id: number;
  entityType: "lead" | "deal" | "contact";
  label?: string;
  options?: Array<{ value: string; label: string }> | null;
  isRequired?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export interface WebLeadFormField {
  name: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select";
  required: boolean;
  options?: string[];
}

export interface WebLeadForm {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  fields: WebLeadFormField[];
  publicToken: string;
  isActive: boolean;
  submitMessage: string;
  redirectUrl: string | null;
  totalSubmissions: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateWebLeadFormInput {
  name: string;
  description?: string;
  fields?: WebLeadFormField[];
  submitMessage?: string;
  redirectUrl?: string;
  isActive?: boolean;
}

interface UpdateWebLeadFormInput extends Partial<CreateWebLeadFormInput> {
  id: number;
}

export function useMyTargets() {
  return useQuery({
    queryKey: queryKeys.targets.myTargets(),
    queryFn: () => apiClient.get<Target[]>("/targets/my"),
    staleTime: 2 * 60_000,
  });
}

export function useTargetLeaderboard(metricType?: string) {
  return useQuery({
    queryKey: queryKeys.targets.leaderboard(metricType),
    queryFn: () =>
      apiClient.get<TargetLeaderboardEntry[]>(
        "/targets/leaderboard",
        metricType ? { metricType } : undefined
      ),
    staleTime: 2 * 60_000,
  });
}

export function useTargetHistory(targetId: number) {
  return useQuery({
    queryKey: queryKeys.targets.history(targetId),
    queryFn: () => apiClient.get<TargetHistory[]>(`/targets/${targetId}/history`),
    staleTime: 2 * 60_000,
    enabled: targetId > 0,
  });
}

export function useCreateTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTargetInput) =>
      apiClient.post<Target[]>("/targets", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.targets.all });
    },
  });
}

export function useTerritories() {
  return useQuery({
    queryKey: queryKeys.territories.all,
    queryFn: () => apiClient.get<Territory[]>("/crm/territories"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTerritoryInput) =>
      apiClient.post<Territory>("/crm/territories", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.territories.all }),
  });
}

export function useUpdateTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateTerritoryInput) =>
      apiClient.patch<Territory>(`/crm/territories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.territories.all }),
  });
}

export function useDeleteTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/territories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.territories.all }),
  });
}

export function useCustomFields(entityType: "lead" | "deal" | "contact") {
  return useQuery({
    queryKey: queryKeys.settings.customFields(entityType),
    queryFn: () =>
      apiClient.get<{ fields: CustomFieldDefinition[] }>(
        `/settings/custom-fields?entityType=${entityType}`
      ),
    staleTime: 2 * 60_000,
  });
}

export function useCreateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomFieldInput) =>
      apiClient.post<{ field: CustomFieldDefinition }>("/settings/custom-fields", input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.customFields(vars.entityType) });
    },
  });
}

export function useUpdateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: ({ id, entityType, ...data }: UpdateCustomFieldInput) =>
      apiClient.patch<{ field: CustomFieldDefinition }>(`/settings/custom-fields/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.customFields(vars.entityType) });
    },
  });
}

export function useDeleteCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; entityType: "lead" | "deal" | "contact" }) =>
      apiClient.delete<{ success: boolean }>(`/settings/custom-fields/${id}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.customFields(vars.entityType) });
    },
  });
}

export function useWebLeadForms() {
  return useQuery({
    queryKey: queryKeys.webLeadForms.list(),
    queryFn: () => apiClient.get<WebLeadForm[]>("/crm/web-forms"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateWebLeadForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWebLeadFormInput) =>
      apiClient.post<WebLeadForm>("/crm/web-forms", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.webLeadForms.all });
    },
  });
}

export function useUpdateWebLeadForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateWebLeadFormInput) =>
      apiClient.patch<WebLeadForm>(`/crm/web-forms/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.webLeadForms.all });
    },
  });
}

export function useDeleteWebLeadForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/web-forms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.webLeadForms.all });
    },
  });
}
