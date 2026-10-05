"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  IntakeRequest,
  CreateIntakeRequestInput,
  UpdateIntakeRequestInput,
} from "@/types/projects";

const intakeListContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.intakeListContract),
);
const intakeItemContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.intakeItemContract),
);

interface IntakePage {
  data: IntakeRequest[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export function useIntakeRequests(
  projectId: number,
  params?: { status?: string; source?: "manual" | "web_form" | "email"; cursor?: string; limit?: number },
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

export function useCreateIntakeRequest(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "intake", "create"],
    mutationFn: ({ projectId, ...data }: CreateIntakeRequestInput) =>
      apiClient.post<IntakeRequest>(`/build/${projectId}/intake`, data, undefined, intakeItemContract),
    onSuccess: (_: unknown, variables: CreateIntakeRequestInput) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.intake(variables.projectId),
      });
    },
  });
}

export function useUpdateIntakeRequest(options?: UseMutationOptions<IntakeRequest, Error, UpdateIntakeRequestInput & { projectId: number }>) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    ...options,
    mutationKey: ["projects", "intake", "update"],
    mutationFn: ({ intakeRequestId, projectId, ...data }: UpdateIntakeRequestInput & { projectId: number }) =>
      apiClient.patch<IntakeRequest>(
        `/build/${projectId}/intake/${intakeRequestId}`,
        data,
        undefined,
        intakeItemContract,
      ),
    onSuccess: (_: IntakeRequest, variables: UpdateIntakeRequestInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.intake(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.detail(variables.projectId),
      });
    },
  });
}
