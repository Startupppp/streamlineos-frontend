"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  AddTeamMemberInput,
  CreateTeamInput,
  ProjectTeam,
  ProjectTeamDetail,
  TeamListResponse,
  UpdateTeamInput,
} from "@/types/projects";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";


const teamPageContract = lazyContract(() =>
  import("@/hooks/api/build/teams-schema").then((m) => m.teamPageContract),
);
const teamRowContract = lazyContract(() =>
  import("@/hooks/api/build/teams-schema").then((m) => m.teamRowContract),
);
const teamDetailContract = lazyContract(() =>
  import("@/hooks/api/build/teams-schema").then((m) => m.teamDetailContract),
);
const teamProjectItemListContract = lazyContract(() =>
  import("@/hooks/api/build/teams-schema").then((m) => m.teamProjectItemListContract),
);
const teamMemberRowContract = lazyContract(() =>
  import("@/hooks/api/build/teams-schema").then((m) => m.teamMemberRowContract),
);
const teamProjectRowContract = lazyContract(() =>
  import("@/hooks/api/build/teams-schema").then((m) => m.teamProjectRowContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

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
  return useGatedQuery<TeamListResponse>("build:teams:view", {
    queryKey: buildWorkQueryKeys.projects.teams.list(Object.keys(query).length ? query : undefined),
    queryFn: ({ signal }) => apiClient.get<TeamListResponse>("/build/teams", query, signal, teamPageContract),
    staleTime: 60_000,
  });
}

export function useProjectTeam(teamId: number) {
  return useGatedQuery<ProjectTeamDetail>("build:teams:view", {
    queryKey: buildWorkQueryKeys.projects.teams.detail(teamId),
    queryFn: ({ signal }) => apiClient.get<ProjectTeamDetail>(`/build/teams/${teamId}`, undefined, signal, teamDetailContract),
    enabled: !!teamId,
    staleTime: 60_000,
  });
}

export function useCreateProjectTeam() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:teams:create", {
    mutationKey: [...buildWorkQueryKeys.projects.teams.all, "create"],
    mutationFn: (data: CreateTeamInput) =>
      apiClient.post<ProjectTeam>("/build/teams", data, undefined, teamRowContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.teams.all });
    },
  });
}

export function useUpdateProjectTeam() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:teams:update", {
    mutationKey: [...buildWorkQueryKeys.projects.teams.all, "update"],
    mutationFn: ({ teamId, ...data }: UpdateTeamInput & { teamId: number }) =>
      apiClient.patch<ProjectTeam>(`/build/teams/${teamId}`, data, undefined, teamRowContract),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.teams.list() });
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.teams.detail(vars.teamId) });
    },
  });
}

export function useDeleteProjectTeam() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:teams:delete", {
    mutationKey: [...buildWorkQueryKeys.projects.teams.all, "delete"],
    mutationFn: (teamId: number) =>
      apiClient.delete<void>(`/build/teams/${teamId}`, undefined, undefined, noContentContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.teams.all });
    },
  });
}

export function useAddProjectTeamMember(teamId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:teams:manage", {
    mutationKey: [...buildWorkQueryKeys.projects.teams.members(teamId), "add"],
    mutationFn: (data: AddTeamMemberInput) =>
      apiClient.post<z.infer<typeof teamMemberRowContract>>(`/build/teams/${teamId}/members`, data, undefined, teamMemberRowContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.teams.members(teamId) });
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.teams.detail(teamId) });
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.teams.list() });
    },
  });
}

export function useRemoveProjectTeamMember(teamId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:teams:manage", {
    mutationKey: [...buildWorkQueryKeys.projects.teams.members(teamId), "remove"],
    mutationFn: (memberId: string) =>
      apiClient.delete<void>(`/build/teams/${teamId}/members/${memberId}`, undefined, undefined, noContentContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.teams.members(teamId) });
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.teams.detail(teamId) });
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.teams.list() });
    },
  });
}

export function useUpdateProjectTeamMemberRole(teamId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:teams:manage", {
    mutationKey: [...buildWorkQueryKeys.projects.teams.members(teamId), "updateRole"],
    mutationFn: ({ memberUserId, role }: { memberUserId: string; role: "member" | "lead" }) =>
      apiClient.patch<z.infer<typeof teamMemberRowContract>>(`/build/teams/${teamId}/members/${memberUserId}`, { role }, undefined, teamMemberRowContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.teams.members(teamId) });
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.teams.detail(teamId) });
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
    queryKey: buildWorkQueryKeys.projects.teams.teamProjects(teamId),
    queryFn: ({ signal }) => apiClient.get<TeamProject[]>(`/build/teams/${teamId}/projects`, undefined, signal, teamProjectItemListContract),
    staleTime: 30_000,
    enabled,
    ...restOptions,
  });
}

export function useAddTeamProject(teamId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:teams:manage", {
    mutationKey: [...buildWorkQueryKeys.projects.teams.teamProjects(teamId), "add"],
    mutationFn: (projectId: number) =>
      apiClient.post<z.infer<typeof teamProjectRowContract>>(`/build/teams/${teamId}/projects`, { projectId }, undefined, teamProjectRowContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.teams.teamProjects(teamId) });
    },
  });
}

export function useRemoveTeamProject(teamId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:teams:manage", {
    mutationKey: [...buildWorkQueryKeys.projects.teams.teamProjects(teamId), "remove"],
    mutationFn: (projectId: number) =>
      apiClient.delete<void>(`/build/teams/${teamId}/projects/${projectId}`, undefined, undefined, noContentContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.teams.teamProjects(teamId) });
    },
  });
}
