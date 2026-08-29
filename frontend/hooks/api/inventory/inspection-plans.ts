"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

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

const BASE = "/inventory/quality/inspection-plans";

export function useInspectionPlans(
  params?: InspectionPlansParams,
  options?: { enabled?: boolean },
) {
  const canView = useCan("inventory:quality:read");
  return useQuery<InspectionPlanListResponse, Error>({
    queryKey: queryKeys.inspectionPlans.plans(params),
    queryFn: () =>
      apiClient.get<InspectionPlanListResponse>(BASE, {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.isActive ? { isActive: params.isActive } : {}),
        ...(params?.appliesOn ? { appliesOn: params.appliesOn } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }),
    staleTime: 60_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useInspectionPlan(planId: number) {
  const canView = useCan("inventory:quality:read");
  return useQuery<InspectionPlan, Error>({
    queryKey: queryKeys.inspectionPlans.plan(planId),
    queryFn: () => apiClient.get<InspectionPlan>(`${BASE}/${planId}`),
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
  return useMutation<InspectionPlan, Error, CreateInspectionPlanPayload>({
    mutationKey: ["inventory", "quality", "inspection-plan", "create"],
    mutationFn: (payload) => apiClient.post<InspectionPlan>(BASE, payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateInspectionPlan() {
  const invalidate = useInvalidatePlans();
  return useMutation<
    InspectionPlan,
    Error,
    { planId: number; payload: UpdateInspectionPlanPayload }
  >({
    mutationKey: ["inventory", "quality", "inspection-plan", "update"],
    mutationFn: ({ planId, payload }) =>
      apiClient.patch<InspectionPlan>(`${BASE}/${planId}`, payload),
    onSuccess: (_, variables) => invalidate(variables.planId),
  });
}

export function useDeleteInspectionPlan() {
  const invalidate = useInvalidatePlans();
  return useMutation<{ deleted: boolean; planId: number }, Error, number>({
    mutationKey: ["inventory", "quality", "inspection-plan", "delete"],
    mutationFn: (planId) =>
      apiClient.delete<{ deleted: boolean; planId: number }>(`${BASE}/${planId}`),
    onSuccess: (_, planId) => invalidate(planId),
  });
}

/**
 * Publishing a new rule. A published version is never edited — an inspection
 * records the version it was judged against — so a change is always a new one.
 */
export function useCreatePlanVersion() {
  const invalidate = useInvalidatePlans();
  return useMutation<
    { planId: number; versionId: number },
    Error,
    { planId: number; payload: CreatePlanVersionPayload }
  >({
    mutationKey: ["inventory", "quality", "inspection-plan", "version"],
    mutationFn: ({ planId, payload }) =>
      apiClient.post<{ planId: number; versionId: number }>(
        `${BASE}/${planId}/versions`,
        payload,
      ),
    onSuccess: (_, variables) => invalidate(variables.planId),
  });
}

export function useActivatePlanVersion() {
  const invalidate = useInvalidatePlans();
  return useMutation<InspectionPlan, Error, { planId: number; versionId: number }>({
    mutationKey: ["inventory", "quality", "inspection-plan", "activate"],
    mutationFn: ({ planId, versionId }) =>
      apiClient.post<InspectionPlan>(`${BASE}/${planId}/versions/${versionId}/activate`),
    onSuccess: (_, variables) => invalidate(variables.planId),
  });
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
