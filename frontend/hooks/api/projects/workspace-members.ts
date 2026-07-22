"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { UsersResponse } from "@/hooks/api/users";

interface ProjectWorkspaceMembersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "suspended" | "archived";
}

const WORKSPACE_MEMBERS_BASE = ["streamlineos", "projects", "workspaceMembers"] as const;

export const projectWorkspaceMembersQueryKeys = {
  all: WORKSPACE_MEMBERS_BASE,
  list: (params?: Record<string, unknown>) =>
    [...WORKSPACE_MEMBERS_BASE, "list", params] as const,
};

export function useProjectWorkspaceMembers(
  params?: ProjectWorkspaceMembersParams,
  options?: Omit<UseQueryOptions<UsersResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<UsersResponse, Error>({
    queryKey: projectWorkspaceMembersQueryKeys.list(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<UsersResponse>("/projects/members", {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.status ? { status: params.status } : {}),
      }),
    staleTime: 30_000,
    ...options,
  });
}
