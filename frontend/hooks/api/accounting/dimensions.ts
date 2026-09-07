"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";
import {
  dimensionListContract,
  dimensionCreatedContract,
  dimensionUpdatedContract,
  dimensionValueListContract,
  dimensionValueCreatedContract,
  dimensionValueUpdatedContract,
} from "@/hooks/api/accounting/dimensions-schema";

const dimensionKeys = {
  all: [...queryKeyBase, "accounting", "core", "dimensions"] as const,
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
    queryFn: ({ signal }) => apiClient.get("/accounting/dimensions", undefined, signal, dimensionListContract),
    staleTime: 120_000,
    enabled: can,
  });
}

export function useCreateDimension() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AccountingDimension, Error, CreateDimensionInput>("accounting:dimensions:manage", {
    mutationKey: [...dimensionKeys.all, "create"],
    mutationFn: (body) =>
      apiClient.post("/accounting/dimensions", body, undefined, dimensionCreatedContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dimensionKeys.list() });
    },
  });
}

export function useUpdateDimension(dimensionId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AccountingDimension, Error, UpdateDimensionInput>("accounting:dimensions:manage", {
    mutationKey: [...dimensionKeys.all, "update", dimensionId],
    mutationFn: (body) =>
      apiClient.patch(`/accounting/dimensions/${dimensionId}`, body, undefined, dimensionUpdatedContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dimensionKeys.list() });
    },
  });
}

export function useDimensionValues(dimensionId: number, enabled = true) {
  const can = useCan("accounting:dimensions:read");
  return useQuery<{ items: AccountingDimensionValue[] }, Error>({
    queryKey: dimensionKeys.values(dimensionId),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/accounting/dimensions/${dimensionId}/values`, undefined, signal, dimensionValueListContract,
      ),
    staleTime: 60_000,
    enabled: can && enabled && dimensionId > 0,
  });
}

export function useCreateDimensionValue(dimensionId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AccountingDimensionValue, Error, CreateDimensionValueInput>("accounting:dimensions:manage", {
    mutationKey: [...dimensionKeys.all, "create-value", dimensionId],
    mutationFn: (body) =>
      apiClient.post(
        `/accounting/dimensions/${dimensionId}/values`,
        body, undefined, dimensionValueCreatedContract,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dimensionKeys.values(dimensionId) });
      void queryClient.invalidateQueries({ queryKey: dimensionKeys.list() });
    },
  });
}

export function useUpdateDimensionValue(dimensionId: number, valueId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AccountingDimensionValue, Error, UpdateDimensionValueInput>("accounting:dimensions:manage", {
    mutationKey: [...dimensionKeys.all, "update-value", dimensionId, valueId],
    mutationFn: (body) =>
      apiClient.patch(
        `/accounting/dimensions/${dimensionId}/values/${valueId}`,
        body, undefined, dimensionValueUpdatedContract,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dimensionKeys.values(dimensionId) });
    },
  });
}
