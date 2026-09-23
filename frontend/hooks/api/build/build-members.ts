"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const buildMemberPageContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.buildMemberPageContract),
);

const buildMemberRowContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.buildMemberRowContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
export interface BuildMember {
  id: string;
  role: "member" | "admin";
  addedAt: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  image: string | null;
  teams: string[];
}

export interface BuildMembersResponse {
  data: BuildMember[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

interface BuildMembersParams {
  cursor?: string;
  limit?: number;
  search?: string;
  status?: string;
}

export function useBuildMembers(
  params?: BuildMembersParams,
  options?: Omit<UseQueryOptions<BuildMembersResponse, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("build:members:view");
  const { enabled: callerEnabled, ...restOptions } = options ?? {};
  const enabled = canView && (callerEnabled ?? true);

  return useQuery<BuildMembersResponse, Error>({
    queryKey: buildWorkQueryKeys.projects.buildMembers.list(params),
    queryFn: ({ signal }) =>
      apiClient.get<BuildMembersResponse>("/build/members", {
        ...(params?.cursor ? { cursor: params.cursor } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.status ? { status: params.status } : {}),
      }, signal, buildMemberPageContract),
    staleTime: 30_000,
    enabled,
    ...restOptions,
  });
}

export function useAddBuildMember() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:members:manage", {
    mutationKey: [...buildWorkQueryKeys.projects.buildMembers.all, "add"],
    mutationFn: (body: { userId: string; role?: "member" | "admin" }) =>
      apiClient.post<unknown>("/build/members", body, undefined, buildMemberRowContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.buildMembers.all });
    },
  });
}

export function useRemoveBuildMember() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:members:manage", {
    mutationKey: [...buildWorkQueryKeys.projects.buildMembers.all, "remove"],
    mutationFn: (userId: string) =>
      apiClient.delete<void>(`/build/members/${userId}`, undefined, undefined, noContentContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.buildMembers.all });
    },
  });
}
