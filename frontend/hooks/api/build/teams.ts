"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  AddTeamMemberInput,
  CreateTeamInput,
  ProjectTeamDetail,
  TeamListResponse,
  UpdateTeamInput,
} from "@/types/projects";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface TeamProject {
  id: number;
  name: string;
  key: string;
  status: string;
  addedAt: string;
}

export function useProjectTeams(params?: {
  cursor?: string;
  pageSize?: number;
  search?: string;
}) {
  const query: Record<string, string> = {};
  if (params?.cursor) query["cursor"] = params.cursor;
  if (params?.pageSize) query["pageSize"] = String(params.pageSize);
  if (params?.search) query["search"] = params.search;
  return useQuery<TeamListResponse>({
    queryKey: queryKeys.projects.teams.list(Object.keys(query).length ? query : undefined),
    queryFn: ({ signal }) => apiClient.get<TeamListResponse>("/build/teams", query, signal),
    staleTime: 60_000,
  });
}

export function useProjectTeam(teamId: number) {
  return useQuery<ProjectTeamDetail>({
    queryKey: queryKeys.projects.teams.detail(teamId),
    queryFn: ({ signal }) => apiClient.get<ProjectTeamDetail>(`/build/teams/${teamId}`, undefined, signal),
    enabled: !!teamId,
    staleTime: 60_000,
  });
}

export function useCreateProjectTeam() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:teams:create", {
    mutationKey: [...queryKeys.projects.teams.all, "create"],
    mutationFn: (data: CreateTeamInput) =>
      apiClient.post<ProjectTeamDetail>("/build/teams", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.teams.all });
    },
  });
}

export function useUpdateProjectTeam() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: [...queryKeys.projects.teams.all, "update"],
    mutationFn: ({ id, ...data }: UpdateTeamInput & { id: number }) =>
      apiClient.patch<ProjectTeamDetail>(`/build/teams/${id}`, data),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.teams.list() });
      void qc.invalidateQueries({ queryKey: queryKeys.projects.teams.detail(vars.id) });
    },
  });
}

export function useDeleteProjectTeam() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: [...queryKeys.projects.teams.all, "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<void>(`/build/teams/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.teams.all });
    },
  });
}

export function useAddProjectTeamMember(teamId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:teams:manage", {
    mutationKey: [...queryKeys.projects.teams.members(teamId), "add"],
    mutationFn: (data: AddTeamMemberInput) =>
      apiClient.post<void>(`/build/teams/${teamId}/members`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.teams.members(teamId) });
      void qc.invalidateQueries({ queryKey: queryKeys.projects.teams.detail(teamId) });
      void qc.invalidateQueries({ queryKey: queryKeys.projects.teams.list() });
    },
  });
}

export function useRemoveProjectTeamMember(teamId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
    mutationKey: [...queryKeys.projects.teams.members(teamId), "remove"],
    mutationFn: (memberId: string) =>
      apiClient.delete<void>(`/build/teams/${teamId}/members/${memberId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.teams.members(teamId) });
      void qc.invalidateQueries({ queryKey: queryKeys.projects.teams.detail(teamId) });
      void qc.invalidateQueries({ queryKey: queryKeys.projects.teams.list() });
    },
  });
}

export function useUpdateProjectTeamMemberRole(teamId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:approvals:decide", {
    mutationKey: [...queryKeys.projects.teams.members(teamId), "updateRole"],
    mutationFn: ({ memberUserId, role }: { memberUserId: string; role: "member" | "lead" }) =>
      apiClient.patch<void>(`/build/teams/${teamId}/members/${memberUserId}`, { role }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.teams.members(teamId) });
      void qc.invalidateQueries({ queryKey: queryKeys.projects.teams.detail(teamId) });
    },
  });
}

export function useTeamProjects(
  teamId: number,
  options?: Omit<UseQueryOptions<TeamProject[], Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("build:teams:view");
  const { enabled: callerEnabled, ...restOptions } = options ?? {};
  const enabled = canView && !!teamId && (callerEnabled ?? true);

  return useQuery<TeamProject[], Error>({
    queryKey: queryKeys.projects.teams.teamProjects(teamId),
    queryFn: ({ signal }) => apiClient.get<TeamProject[]>(`/build/teams/${teamId}/projects`, undefined, signal),
    staleTime: 30_000,
    enabled,
    ...restOptions,
  });
}

export function useAddTeamProject(teamId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:teams:manage", {
    mutationKey: [...queryKeys.projects.teams.teamProjects(teamId), "add"],
    mutationFn: (projectId: number) =>
      apiClient.post<void>(`/build/teams/${teamId}/projects`, { projectId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.teams.teamProjects(teamId) });
    },
  });
}

export function useRemoveTeamProject(teamId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
    mutationKey: [...queryKeys.projects.teams.teamProjects(teamId), "remove"],
    mutationFn: (projectId: number) =>
      apiClient.delete<void>(`/build/teams/${teamId}/projects/${projectId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.teams.teamProjects(teamId) });
    },
  });
}
