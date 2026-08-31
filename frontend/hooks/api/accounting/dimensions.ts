"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";

const dimensionKeys = {
  all: ["streamlineos", "accounting", "core", "dimensions"] as const,
  list: () => [...dimensionKeys.all, "list"] as const,
  values: (dimensionId: number) => [...dimensionKeys.all, "values", dimensionId] as const,
};

export interface AccountingDimension {
  id: number;
  name: string;
  key: string;
  requiredForAccountTypes: string[];
  isActive: boolean;
  createdAt: string;
  valueCount: number;
}

export interface AccountingDimensionValue {
  id: number;
  orgId: string;
  dimensionId: number;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateDimensionInput {
  name: string;
  key: string;
  requiredForAccountTypes?: string[];
}

export interface UpdateDimensionInput {
  name?: string;
  requiredForAccountTypes?: string[];
  isActive?: boolean;
}

export interface CreateDimensionValueInput {
  name: string;
  code: string;
}

export interface UpdateDimensionValueInput {
  name?: string;
  isActive?: boolean;
}

export function useDimensions() {
  const can = useCan("accounting:dimensions:read");
  return useQuery<{ items: AccountingDimension[] }, Error>({
    queryKey: dimensionKeys.list(),
    queryFn: () => apiClient.get<{ items: AccountingDimension[] }>("/accounting/dimensions"),
    staleTime: 120_000,
    enabled: can,
  });
}

export function useCreateDimension() {
  const queryClient = useQueryClient();
  return useMutation<AccountingDimension, Error, CreateDimensionInput>({
    mutationKey: [...dimensionKeys.all, "create"],
    mutationFn: (body) =>
      apiClient.post<AccountingDimension>("/accounting/dimensions", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dimensionKeys.list() });
    },
  });
}

export function useUpdateDimension(dimensionId: number) {
  const queryClient = useQueryClient();
  return useMutation<AccountingDimension, Error, UpdateDimensionInput>({
    mutationKey: [...dimensionKeys.all, "update", dimensionId],
    mutationFn: (body) =>
      apiClient.patch<AccountingDimension>(`/accounting/dimensions/${dimensionId}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dimensionKeys.list() });
    },
  });
}

export function useDimensionValues(dimensionId: number, enabled = true) {
  const can = useCan("accounting:dimensions:read");
  return useQuery<{ items: AccountingDimensionValue[] }, Error>({
    queryKey: dimensionKeys.values(dimensionId),
    queryFn: () =>
      apiClient.get<{ items: AccountingDimensionValue[] }>(
        `/accounting/dimensions/${dimensionId}/values`,
      ),
    staleTime: 60_000,
    enabled: can && enabled && dimensionId > 0,
  });
}

export function useCreateDimensionValue(dimensionId: number) {
  const queryClient = useQueryClient();
  return useMutation<AccountingDimensionValue, Error, CreateDimensionValueInput>({
    mutationKey: [...dimensionKeys.all, "create-value", dimensionId],
    mutationFn: (body) =>
      apiClient.post<AccountingDimensionValue>(
        `/accounting/dimensions/${dimensionId}/values`,
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dimensionKeys.values(dimensionId) });
      void queryClient.invalidateQueries({ queryKey: dimensionKeys.list() });
    },
  });
}

export function useUpdateDimensionValue(dimensionId: number, valueId: number) {
  const queryClient = useQueryClient();
  return useMutation<AccountingDimensionValue, Error, UpdateDimensionValueInput>({
    mutationKey: [...dimensionKeys.all, "update-value", dimensionId, valueId],
    mutationFn: (body) =>
      apiClient.patch<AccountingDimensionValue>(
        `/accounting/dimensions/${dimensionId}/values/${valueId}`,
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dimensionKeys.values(dimensionId) });
    },
  });
}
