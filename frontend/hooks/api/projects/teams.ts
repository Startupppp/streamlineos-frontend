"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  AddTeamMemberInput,
  CreateTeamInput,
  ProjectTeamDetail,
  TeamListResponse,
  TeamMembersResponse,
  UpdateTeamInput,
} from "@/types/projects";

const TEAMS_BASE = ["projects", "teams"] as const;

export const teamQueryKeys = {
  list: (params?: Record<string, unknown>) =>
    [...TEAMS_BASE, "list", params] as const,
  detail: (teamId: number) => [...TEAMS_BASE, "detail", teamId] as const,
  members: (teamId: number, params?: Record<string, unknown>) =>
    [...TEAMS_BASE, "members", teamId, params] as const,
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
      apiClient.get<TeamListResponse>("/projects/teams", query as Record<string, string>),
    staleTime: 60_000,
  });
}

export function useProjectTeam(teamId: number) {
  return useQuery<ProjectTeamDetail>({
    queryKey: teamQueryKeys.detail(teamId),
    queryFn: () => apiClient.get<ProjectTeamDetail>(`/projects/teams/${teamId}`),
    enabled: !!teamId,
    staleTime: 60_000,
  });
}

export function useCreateProjectTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...TEAMS_BASE, "create"],
    mutationFn: (data: CreateTeamInput) =>
      apiClient.post<ProjectTeamDetail>("/projects/teams", data),
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
      apiClient.patch<ProjectTeamDetail>(`/projects/teams/${id}`, data),
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
      apiClient.delete<void>(`/projects/teams/${id}`),
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
        `/projects/teams/${teamId}/members`,
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
      apiClient.post<void>(`/projects/teams/${teamId}/members`, data),
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
      apiClient.delete<void>(`/projects/teams/${teamId}/members/${memberId}`),
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
      apiClient.patch<void>(`/projects/teams/${teamId}/members/${memberUserId}`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamQueryKeys.members(teamId) });
      qc.invalidateQueries({ queryKey: teamQueryKeys.detail(teamId) });
    },
  });
}
