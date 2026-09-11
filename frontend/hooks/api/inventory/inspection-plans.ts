"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  useAuthorizedIdempotentMutation,
  useIdempotentMutation,
} from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type SamplingMethod = "ALL" | "PERCENTAGE" | "FIXED_QUANTITY";
export type PlanVersionStatus = "DRAFT" | "ACTIVE" | "SUPERSEDED";

export interface InspectionPlanVersion {
  id: number;
  version: number;
  samplingMethod: SamplingMethod;
  sampleValue: string | null;
  instructions: string | null;
  status: PlanVersionStatus;
  activatedAt: string | null;
  createdAt: string;
}

export interface InspectionPlan {
  id: number;
  code: string;
  name: string;
  description: string | null;
  productVariantId: number | null;
  productId: number | null;
  categoryId: number | null;
  appliesOnReceipt: boolean;
  appliesOnReturn: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** The live rule, projected by the list endpoint. */
  activeVersion?: Pick<
    InspectionPlanVersion,
    "id" | "version" | "samplingMethod" | "sampleValue"
  > | null;
  /** "All products", a category name or a SKU — resolved server-side. */
  scopeLabel?: string;
  versions?: InspectionPlanVersion[];
}

export interface InspectionPlansParams {
  [key: string]: unknown;
  search?: string;
  isActive?: "true" | "false";
  appliesOn?: "RECEIPT" | "RETURN";
  page?: number;
  limit?: number;
}

interface InspectionPlanListResponse {
  items: InspectionPlan[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateInspectionPlanPayload {
  code: string;
  name: string;
  description?: string;
  productVariantId?: number;
  productId?: number;
  categoryId?: number;
  appliesOnReceipt: boolean;
  appliesOnReturn: boolean;
  samplingMethod: SamplingMethod;
  sampleValue?: string;
  instructions?: string;
}

export interface UpdateInspectionPlanPayload {
  name?: string;
  description?: string | null;
  appliesOnReceipt?: boolean;
  appliesOnReturn?: boolean;
  isActive?: boolean;
}

export interface CreatePlanVersionPayload {
  samplingMethod: SamplingMethod;
  sampleValue?: string;
  instructions?: string;
  activate: boolean;
}

export function useInspectionPlans(
  params?: InspectionPlansParams,
  options?: { enabled?: boolean },
) {
  const canView = useCan("inventory:quality:read");
  return useQuery<InspectionPlanListResponse, Error>({
    queryKey: queryKeys.inspectionPlans.plans(params),
    queryFn: ({ signal }) =>
      apiClient.get<InspectionPlanListResponse>("/inventory/quality/inspection-plans", {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.isActive ? { isActive: params.isActive } : {}),
        ...(params?.appliesOn ? { appliesOn: params.appliesOn } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }, signal),
    staleTime: 60_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useInspectionPlan(planId: number) {
  const canView = useCan("inventory:quality:read");
  return useQuery<InspectionPlan, Error>({
    queryKey: queryKeys.inspectionPlans.plan(planId),
    queryFn: ({ signal }) =>
      apiClient.get<InspectionPlan>(
        `/inventory/quality/inspection-plans/${planId}`,
        undefined,
        signal,
      ),
    staleTime: 60_000,
    enabled: canView && planId > 0,
  });
}

/** Every list invalidation goes through the params-less prefix — see the key file. */
function useInvalidatePlans() {
  const qc = useQueryClient();
  return (planId?: number) => {
    void qc.invalidateQueries({ queryKey: queryKeys.inspectionPlans.plansList });
    if (planId !== undefined) {
      void qc.invalidateQueries({ queryKey: queryKeys.inspectionPlans.plan(planId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inspectionPlans.versions(planId) });
    }
  };
}

export function useCreateInspectionPlan() {
  const invalidate = useInvalidatePlans();
  return useIdempotentMutation<InspectionPlan, Error, CreateInspectionPlanPayload>({
    mutationKey: ["inventory", "quality", "inspection-plan", "create"],
    mutationFn: (payload, idempotencyKey) =>
      apiClient.post<InspectionPlan>("/inventory/quality/inspection-plans", payload, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateInspectionPlan() {
  const invalidate = useInvalidatePlans();
  return useAuthorizedMutation<
    InspectionPlan,
    Error,
    { planId: number; payload: UpdateInspectionPlanPayload }
  >("inventory:quality:plans:manage", {
    mutationKey: ["inventory", "quality", "inspection-plan", "update"],
    mutationFn: ({ planId, payload }) =>
      apiClient.patch<InspectionPlan>(
        `/inventory/quality/inspection-plans/${planId}`,
        payload,
      ),
    onSuccess: (_, variables) => invalidate(variables.planId),
  });
}

export function useDeleteInspectionPlan() {
  const invalidate = useInvalidatePlans();
  return useAuthorizedMutation<{ deleted: boolean; planId: number }, Error, number>(
    "inventory:quality:plans:manage",
    {
      mutationKey: ["inventory", "quality", "inspection-plan", "delete"],
      mutationFn: (planId) =>
        apiClient.delete<{ deleted: boolean; planId: number }>(
          `/inventory/quality/inspection-plans/${planId}`,
        ),
      onSuccess: (_, planId) => invalidate(planId),
    },
  );
}

/**
 * Publishing a new rule. A published version is never edited — an inspection
 * records the version it was judged against — so a change is always a new one.
 */
export function useCreatePlanVersion() {
  const invalidate = useInvalidatePlans();
  return useAuthorizedIdempotentMutation<
    { planId: number; versionId: number },
    Error,
    { planId: number; payload: CreatePlanVersionPayload }
  >("inventory:quality:plans:manage", {
    mutationKey: ["inventory", "quality", "inspection-plan", "version"],
    mutationFn: ({ planId, payload }, idempotencyKey) =>
      apiClient.post<{ planId: number; versionId: number }>(
        `/inventory/quality/inspection-plans/${planId}/versions`,
        payload,
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_, variables) => invalidate(variables.planId),
  });
}

export function useActivatePlanVersion() {
  const invalidate = useInvalidatePlans();
  return useAuthorizedMutation<InspectionPlan, Error, { planId: number; versionId: number }>(
    "inventory:quality:plans:manage",
    {
      mutationKey: ["inventory", "quality", "inspection-plan", "activate"],
      mutationFn: ({ planId, versionId }) =>
        apiClient.post<InspectionPlan>(
          `/inventory/quality/inspection-plans/${planId}/versions/${versionId}/activate`,
        ),
      onSuccess: (_, variables) => invalidate(variables.planId),
    },
  );
}

/** How a rule reads on a card or a row. */
export function describeSampling(
  method: SamplingMethod,
  sampleValue: string | null | undefined,
): string {
  if (method === "PERCENTAGE") return `${trimZeros(sampleValue)}% of each delivery`;
  if (method === "FIXED_QUANTITY") return `${trimZeros(sampleValue)} units per delivery`;
  return "Every unit";
}

function trimZeros(value: string | null | undefined): string {
  if (!value) return "0";
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}
