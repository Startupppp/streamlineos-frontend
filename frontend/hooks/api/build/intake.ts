"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  IntakeRequest,
  IntakeSource,
  IntakeStatus,
  CreateIntakeRequestInput,
  UpdateIntakeRequestInput,
} from "@/types/projects";
import { patchIntakeListCaches, type IntakePage } from "@/hooks/api/build/intake-cache";

const intakeListContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.intakeListContract),
);
const intakeItemContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.intakeItemContract),
);

export function useIntakeRequests(
  projectId: number,
  params?: { status?: IntakeStatus; source?: IntakeSource; cursor?: string; limit?: number },
  options?: Omit<UseQueryOptions<IntakePage>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  const query: Record<string, string> = {};
  if (params?.status) query["status"] = params.status;
  if (params?.source) query["source"] = params.source;
  if (params?.cursor) query["cursor"] = params.cursor;
  if (params?.limit) query["limit"] = String(params.limit);
  const queryParams = Object.keys(query).length ? query : undefined;
  return useQuery<IntakePage>({
    queryKey: buildWorkQueryKeys.projects.intake(projectId, queryParams),
    queryFn: ({ signal }) =>
      apiClient.get<IntakePage>(
        `/build/${projectId}/intake`,
        queryParams,
        signal,
        intakeListContract,
      ),
    staleTime: 30_000,
    ...options,
    enabled: canView && !!projectId,
  });
}

export function intakeRequestsQueryOptions(projectId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.intake(projectId),
    staleTime: 30_000,
  } as const;
}

export function useCreateIntakeRequest() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    mutationKey: ["projects", "intake", "create"],
    mutationFn: ({ projectId, ...data }: CreateIntakeRequestInput) =>
      apiClient.post<IntakeRequest>(`/build/${projectId}/intake`, data, undefined, intakeItemContract),
    onSuccess: (created: IntakeRequest, variables: CreateIntakeRequestInput) => {
      patchIntakeListCaches(queryClient, variables.projectId, created);
    },
  });
}

export function useUpdateIntakeRequest() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    mutationKey: ["projects", "intake", "update"],
    mutationFn: ({ intakeRequestId, projectId, ...data }: UpdateIntakeRequestInput & { projectId: number }) =>
      apiClient.patch<IntakeRequest>(
        `/build/${projectId}/intake/${intakeRequestId}`,
        data,
        undefined,
        intakeItemContract,
      ),
    onSuccess: (updated: IntakeRequest, variables: UpdateIntakeRequestInput & { projectId: number }) => {
      patchIntakeListCaches(queryClient, variables.projectId, updated);
    },
  });
}
