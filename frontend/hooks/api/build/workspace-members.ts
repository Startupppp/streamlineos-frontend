"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";

export interface ProjectWorkspaceMember {
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

export interface WorkspaceMembersResponse {
  data: ProjectWorkspaceMember[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

interface ProjectWorkspaceMembersParams {
  cursor?: string;
  limit?: number;
  search?: string;
  status?: string;
}

const WORKSPACE_MEMBERS_BASE = ["streamlineos", "projects", "workspaceMembers"] as const;

export const projectWorkspaceMembersQueryKeys = {
  all: WORKSPACE_MEMBERS_BASE,
  list: (params?: Record<string, unknown>) =>
    [...WORKSPACE_MEMBERS_BASE, "list", params] as const,
};

export function useProjectWorkspaceMembers(
  params?: ProjectWorkspaceMembersParams,
  options?: Omit<UseQueryOptions<WorkspaceMembersResponse, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("build:members:view");
  const { enabled: callerEnabled, ...restOptions } = options ?? {};
  const enabled = canView && (callerEnabled ?? true);

  return useQuery<WorkspaceMembersResponse, Error>({
    queryKey: projectWorkspaceMembersQueryKeys.list(params as Record<string, unknown> | undefined),
    queryFn: ({ signal }) =>
      apiClient.get<WorkspaceMembersResponse>("/build/members", {
        ...(params?.cursor ? { cursor: params.cursor } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.status ? { status: params.status } : {}),
      }, signal),
    staleTime: 30_000,
    enabled,
    ...restOptions,
  });
}

export function useAddProjectWorkspaceMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "workspaceMembers", "add"],
    mutationFn: (body: { userId: string; role?: "member" | "admin" }) =>
      apiClient.post<unknown>("/build/members", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectWorkspaceMembersQueryKeys.all });
    },
  });
}

export function useRemoveProjectWorkspaceMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "workspaceMembers", "remove"],
    mutationFn: (userId: string) =>
      apiClient.delete<unknown>(`/build/members/${userId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectWorkspaceMembersQueryKeys.all });
    },
  });
}
