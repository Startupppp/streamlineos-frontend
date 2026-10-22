"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { ProjectDetail, ProjectRequirement, ProjectStatus } from "./projects-types";

export interface CreateProjectInput {
  code: string;
  name: string;
  zone?: string | null;
  city?: string | null;
  siteAddress?: string | null;
  siteContactName?: string | null;
  siteContactPhone?: string | null;
  status?: ProjectStatus;
  startsOn?: string | null;
  endsOn?: string | null;
  notes?: string | null;
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<ProjectDetail, Error, CreateProjectInput>("inventory:projects:manage", {
    mutationKey: ["inventory", "project", "create"],
    mutationFn: (data, idempotencyKey) => apiClient.post<ProjectDetail>("/inventory/projects", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryProjects.listAll });
    },
  });
}

export interface AddRequirementInput {
  projectId: number;
  productVariantId: number;
  warehouseId?: number | null;
  requiredQty: string;
  requiredBy?: string | null;
  notes?: string | null;
}

export function useAddRequirement() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<ProjectRequirement, Error, AddRequirementInput>("inventory:projects:manage", {
    mutationKey: ["inventory", "project", "requirement", "add"],
    mutationFn: ({ projectId, ...body }, idempotencyKey) =>
      apiClient.post<ProjectRequirement>(`/inventory/projects/${projectId}/requirements`, body, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_r, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryProjects.detail(vars.projectId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryProjects.atRisk });
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryOpsBoard.attention });
    },
  });
}

export interface UpdateRequirementInput {
  projectId: number;
  requirementId: number;
  warehouseId?: number | null;
  requiredQty?: string;
  requiredBy?: string | null;
  status?: "DRAFT" | "REQUESTED" | "CANCELLED";
  notes?: string | null;
}

export function useUpdateRequirement() {
  const qc = useQueryClient();
  return useAuthorizedMutation<ProjectRequirement, Error, UpdateRequirementInput>(
    "inventory:projects:manage",
    {
      mutationKey: ["inventory", "project", "requirement", "update"],
      mutationFn: ({ projectId, requirementId, ...body }) =>
        apiClient.patch<ProjectRequirement>(
          `/inventory/projects/${projectId}/requirements/${requirementId}`,
          body,
        ),
      onSuccess: (_r, vars) => {
        void qc.invalidateQueries({ queryKey: queryKeys.inventoryProjects.detail(vars.projectId) });
        void qc.invalidateQueries({ queryKey: queryKeys.inventoryProjects.atRisk });
        void qc.invalidateQueries({ queryKey: queryKeys.inventoryOpsBoard.attention });
      },
    },
  );
}

export interface ReserveRequirementInput {
  projectId: number;
  requirementId: number;
  qty?: string;
  warehouseId?: number;
  locationId?: number;
  expiresAt?: string;
}

export function useReserveRequirement() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<{ id: number }, Error, ReserveRequirementInput>("inventory:stock:reserve", {
    mutationKey: ["inventory", "project", "requirement", "reserve"],
    mutationFn: ({ projectId, requirementId, ...body }, idempotencyKey) =>
      apiClient.post<{ id: number }>(
        `/inventory/projects/${projectId}/requirements/${requirementId}/reserve`,
        body, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_r, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryProjects.detail(vars.projectId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryProjects.atRisk });
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryOpsBoard.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useReleaseRequirement() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<{ released: number }, Error, { projectId: number; requirementId: number }>(
    "inventory:stock:reserve",
    {
      mutationKey: ["inventory", "project", "requirement", "release"],
      mutationFn: ({ projectId, requirementId }, idempotencyKey) =>
        apiClient.post<{ released: number }>(
          `/inventory/projects/${projectId}/requirements/${requirementId}/release`,
          {}, { headers: { "Idempotency-Key": idempotencyKey } },
        ),
      onSuccess: (_r, vars) => {
        void qc.invalidateQueries({ queryKey: queryKeys.inventoryProjects.detail(vars.projectId) });
        void qc.invalidateQueries({ queryKey: queryKeys.inventoryProjects.atRisk });
        void qc.invalidateQueries({ queryKey: queryKeys.inventoryOpsBoard.all });
        void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      },
    },
  );
}
