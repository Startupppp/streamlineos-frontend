"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
import { lazyContract } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  AddProjectMemberInput,
  ProjectMember,
  ProjectMemberRecord,
} from "@/types/projects";

const memberListLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then(
    (m) => m.projectMemberListContract,
  ),
);
const memberRowLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then(
    (m) => m.projectMemberRowContract,
  ),
);
const memberRoleLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then(
    (m) => m.memberRoleContract,
  ),
);

export function useProjectMembers(
  projectId: number,
  options?: Omit<
    UseQueryOptions<ProjectMemberRecord[]>,
    "queryKey" | "queryFn"
  >,
) {
  const canView = useCan("build:view");
  const { enabled: callerEnabled, ...restOptions } = options ?? {};
  return useQuery<ProjectMemberRecord[]>({
    queryKey: buildWorkQueryKeys.projects.members(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectMemberRecord[]>(
        `/build/${projectId}/members`,
        undefined,
        signal,
        memberListLazy,
      ),
    staleTime: 30_000,
    ...restOptions,
    enabled: canView && !!projectId && (callerEnabled ?? true),
  });
}

export function useAddProjectMember(
  options?: Omit<
    UseMutationOptions<ProjectMember, Error, AddProjectMemberInput>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ProjectMember, Error, AddProjectMemberInput>(
    "build:manage",
    {
      ...options,
      mutationKey: ["projects", "members", "add"],
      mutationFn: ({ projectId, ...data }: AddProjectMemberInput) =>
        apiClient.post<ProjectMember>(
          `/build/${projectId}/members`,
          data,
          undefined,
          memberRowLazy,
        ),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.members(variables.projectId),
        });
      },
    },
  );
}

type UpdateMemberRoleInput = {
  projectId: number;
  memberUserId: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
};

export function useUpdateProjectMemberRole(
  options?: Omit<
    UseMutationOptions<
      { userId: string; role: string | null },
      Error,
      UpdateMemberRoleInput
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { userId: string; role: string | null },
    Error,
    UpdateMemberRoleInput
  >("build:manage", {
    ...options,
    mutationKey: ["projects", "members", "update-role"],
    mutationFn: ({ projectId, memberUserId, role }) =>
      apiClient.patch<{ userId: string; role: string | null }>(
        `/build/${projectId}/members/${memberUserId}`,
        { role },
        undefined,
        memberRoleLazy,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.members(variables.projectId),
      });
    },
  });
}
