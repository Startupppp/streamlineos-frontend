"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  AddTeamMemberInput,
  CreateTeamInput,
  ProjectTeamDetail,
  TeamListResponse,
  TeamMembersResponse,
  UpdateTeamInput,
} from "@/types/projects";
import { useCan } from "@/hooks/api/access";

const TEAMS_BASE = ["projects", "teams"] as const;

export interface TeamProject {
  id: number;
  name: string;
  key: string;
  status: string;
  addedAt: string;
}

export const teamQueryKeys = {
  list: (params?: Record<string, unknown>) =>
    [...TEAMS_BASE, "list", params] as const,
  detail: (teamId: number) => [...TEAMS_BASE, "detail", teamId] as const,
  members: (teamId: number, params?: Record<string, unknown>) =>
    [...TEAMS_BASE, "members", teamId, params] as const,
  projects: (teamId: number) => [...TEAMS_BASE, "projects", teamId] as const,
};

export function useProjectTeams(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const query: Record<string, unknown> = {};
  if (params?.page) query["page"] = params.page;
  if (params?.pageSize) query["pageSize"] = params.pageSize;
  if (params?.search) query["search"] = params.search;
  return useQuery<TeamListResponse>({
    queryKey: teamQueryKeys.list(Object.keys(query).length ? query : undefined),
    queryFn: () =>
      apiClient.get<TeamListResponse>("/build/teams", query as Record<string, string>),
    staleTime: 60_000,
  });
}

export function useProjectTeam(teamId: number) {
  return useQuery<ProjectTeamDetail>({
    queryKey: teamQueryKeys.detail(teamId),
    queryFn: () => apiClient.get<ProjectTeamDetail>(`/build/teams/${teamId}`),
    enabled: !!teamId,
    staleTime: 60_000,
  });
}

export function useCreateProjectTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...TEAMS_BASE, "create"],
    mutationFn: (data: CreateTeamInput) =>
      apiClient.post<ProjectTeamDetail>("/build/teams", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEAMS_BASE });
    },
  });
}

export function useUpdateProjectTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...TEAMS_BASE, "update"],
    mutationFn: ({ id, ...data }: UpdateTeamInput & { id: number }) =>
      apiClient.patch<ProjectTeamDetail>(`/build/teams/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: teamQueryKeys.list() });
      qc.invalidateQueries({ queryKey: teamQueryKeys.detail(vars.id) });
    },
  });
}

export function useDeleteProjectTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...TEAMS_BASE, "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<void>(`/build/teams/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEAMS_BASE });
    },
  });
}

export function useProjectTeamMembers(
  teamId: number,
  params?: { page?: number; pageSize?: number },
) {
  const query: Record<string, unknown> = {};
  if (params?.page) query["page"] = params.page;
  if (params?.pageSize) query["pageSize"] = params.pageSize;
  return useQuery<TeamMembersResponse>({
    queryKey: teamQueryKeys.members(teamId, Object.keys(query).length ? query : undefined),
    queryFn: () =>
      apiClient.get<TeamMembersResponse>(
        `/build/teams/${teamId}/members`,
        query as Record<string, string>,
      ),
    enabled: !!teamId,
    staleTime: 60_000,
  });
}

export function useAddProjectTeamMember(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...TEAMS_BASE, "members", teamId, "add"],
    mutationFn: (data: AddTeamMemberInput) =>
      apiClient.post<void>(`/build/teams/${teamId}/members`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamQueryKeys.members(teamId) });
      qc.invalidateQueries({ queryKey: teamQueryKeys.detail(teamId) });
      qc.invalidateQueries({ queryKey: teamQueryKeys.list() });
    },
  });
}

export function useRemoveProjectTeamMember(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...TEAMS_BASE, "members", teamId, "remove"],
    mutationFn: (memberId: string) =>
      apiClient.delete<void>(`/build/teams/${teamId}/members/${memberId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamQueryKeys.members(teamId) });
      qc.invalidateQueries({ queryKey: teamQueryKeys.detail(teamId) });
      qc.invalidateQueries({ queryKey: teamQueryKeys.list() });
    },
  });
}

export function useUpdateProjectTeamMemberRole(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...TEAMS_BASE, "members", teamId, "updateRole"],
    mutationFn: ({ memberUserId, role }: { memberUserId: string; role: "member" | "lead" }) =>
      apiClient.patch<void>(`/build/teams/${teamId}/members/${memberUserId}`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamQueryKeys.members(teamId) });
      qc.invalidateQueries({ queryKey: teamQueryKeys.detail(teamId) });
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
    queryKey: teamQueryKeys.projects(teamId),
    queryFn: () => apiClient.get<TeamProject[]>(`/build/teams/${teamId}/projects`),
    staleTime: 30_000,
    enabled,
    ...restOptions,
  });
}

export function useAddTeamProject(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...TEAMS_BASE, "projects", teamId, "add"],
    mutationFn: (projectId: number) =>
      apiClient.post<void>(`/build/teams/${teamId}/projects`, { projectId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamQueryKeys.projects(teamId) });
    },
  });
}

export function useRemoveTeamProject(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...TEAMS_BASE, "projects", teamId, "remove"],
    mutationFn: (projectId: number) =>
      apiClient.delete<void>(`/build/teams/${teamId}/projects/${projectId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamQueryKeys.projects(teamId) });
    },
  });
}
