"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { HeadcountListPage } from "@/hooks/api/hr/headcount-schema";

const headcountListPageC = lazyContract(() =>
  import("@/hooks/api/hr/headcount-schema").then((m) => m.headcountListPageContract),
);

export type HeadcountStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "JOB_CREATED";

export interface HeadcountRequest {
  id: number;
  orgId: string;
  orgDepartmentId: string | null;
  requestedBy: string;
  requestedByMembershipId: number | null;
  requestedRole: string;
  level: string | null;
  justification: string | null;
  targetDate: string | null;
  status: HeadcountStatus;
  approvedBy: string | null;
  approvedByMembershipId: number | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  linkedJobPostingId: number | null;
  createdAt: string;
  updatedAt: string;
  departmentId?: number | null;
  departmentName?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
}

export interface CreateHeadcountRequestInput {
  requestedRole: string;
  level?: string;
  departmentId?: number;
  justification?: string;
  targetDate?: string;
  status: "DRAFT" | "SUBMITTED";
}

export interface UpdateHeadcountRequestInput extends CreateHeadcountRequestInput {
  headcountId: number;
}

export interface RejectHeadcountRequestInput {
  headcountId: number;
  reason: string;
}

export function useHeadcountRequests(
  options?: Omit<UseQueryOptions<HeadcountRequest[], Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("hr:employees:view");
  return useQuery<HeadcountRequest[], Error>({
    queryKey: humanResourcesQueryKeys.hr.headcountRequests(),
    queryFn: async ({ signal }) => {
      const page = await apiClient.get<HeadcountListPage>(
        "/hr/recruitment/headcount",
        undefined,
        signal,
        headcountListPageC,
      );
      return page.data;
    },
    staleTime: 2 * 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useCreateHeadcountRequest(
  options?: UseMutationOptions<unknown, Error, CreateHeadcountRequestInput>,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, CreateHeadcountRequestInput>("hr:employees:view", {
    mutationKey: ["hr", "headcount", "create"],
    mutationFn: (data: CreateHeadcountRequestInput) =>
      apiClient.post<HeadcountRequest>("/hr/recruitment/headcount", data, undefined, lazyContract(() => import("@/hooks/api/hr/headcount-schema").then(m => m.headcountRowSingleContract))),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.headcountRequests() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useUpdateHeadcountRequest(
  options?: UseMutationOptions<unknown, Error, UpdateHeadcountRequestInput>,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, UpdateHeadcountRequestInput>("hr:employees:view", {
    mutationKey: ["hr", "headcount", "update"],
    mutationFn: ({ headcountId, ...data }: UpdateHeadcountRequestInput) =>
      apiClient.patch<HeadcountRequest>(`/hr/recruitment/headcount/${headcountId}`, data, undefined, lazyContract(() => import("@/hooks/api/hr/headcount-schema").then(m => m.headcountRowSingleContract))),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.headcountRequests() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useRejectHeadcountRequest(
  options?: UseMutationOptions<unknown, Error, RejectHeadcountRequestInput>,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, RejectHeadcountRequestInput>("hr:employees:manage", {
    mutationKey: ["hr", "headcount", "reject"],
    mutationFn: ({ headcountId, reason }: RejectHeadcountRequestInput) =>
      apiClient.post<HeadcountRequest>(`/hr/recruitment/headcount/${headcountId}/reject`, { reason }, undefined, lazyContract(() => import("@/hooks/api/hr/headcount-schema").then(m => m.headcountRowSingleContract))),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.headcountRequests() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useApproveHeadcountRequest(
  options?: UseMutationOptions<unknown, Error, number>,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, number>("hr:employees:manage", {
    mutationKey: ["hr", "headcount", "approve"],
    mutationFn: (headcountId: number) =>
      apiClient.post<HeadcountRequest>(`/hr/recruitment/headcount/${headcountId}/approve`, {}, undefined, lazyContract(() => import("@/hooks/api/hr/headcount-schema").then(m => m.headcountRowSingleContract))),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.headcountRequests() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useCreateHeadcountJob(
  options?: UseMutationOptions<{ jobId: number }, Error, number>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "headcount", "create-job"],
    mutationFn: (headcountId: number) =>
      apiClient.post<{ jobId: number }>(`/hr/recruitment/headcount/${headcountId}/create-job`, {}, undefined, lazyContract(() => import("@/hooks/api/hr/headcount-schema").then(m => m.createJobFromHeadcountContract))),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.headcountRequests() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}
