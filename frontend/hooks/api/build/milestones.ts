"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  ProjectMilestone as ProjectMilestoneBase,
  ProjectBudget,
  ProjectBudgetUpdate,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";

export type ProjectMilestone = ProjectMilestoneBase & {
  completedTicketCount: number;
};

type MilestonePage = {
  data: ProjectMilestone[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

const milestoneListContract = lazyContract<MilestonePage>(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.milestoneListContract),
);
const milestoneRowContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then(
    (m) => m.milestoneRowContract,
  ),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const projectBudgetContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then(
    (m) => m.projectBudgetContract,
  ),
);
const projectBudgetUpdateContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then(
    (m) => m.projectBudgetUpdateContract,
  ),
);

interface CreateMilestoneInput {
  name: string;
  description?: string;
  targetDate: string;
  status?: "PENDING" | "ACHIEVED" | "MISSED";
  ownerMembershipId?: number | null;
}

interface UpdateMilestoneInput {
  version: number;
  name?: string;
  description?: string;
  targetDate?: string;
  status?: "PENDING" | "ACHIEVED" | "MISSED";
  ownerMembershipId?: number | null;
}

interface MilestoneListQuery {
  cursor?: string;
  limit?: number;
  status?: "PENDING" | "ACHIEVED" | "MISSED";
  q?: string;
  from?: string;
  to?: string;
  ownerId?: number;
}

function milestoneBaseKey(projectId: number) {
  return [...queryKeyBase, "projects", projectId, "milestones"] as const;
}

function milestoneKey(projectId: number, query?: MilestoneListQuery) {
  return [...milestoneBaseKey(projectId), query ?? {}] as const;
}

export function useProjectMilestones(
  projectId: number,
  query: MilestoneListQuery = {},
) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: milestoneKey(projectId, query),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/build/${projectId}/milestones`,
        query,
        signal,
        milestoneListContract,
      ),
    enabled: canView && !!projectId,
    staleTime: 30_000,
  });
}

export function useCreateMilestone(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    mutationKey: ["projects", "milestones", "create"],
    mutationFn: (input: CreateMilestoneInput) =>
      apiClient.post<ProjectMilestone>(
        `/build/${projectId}/milestones`,
        input,
        undefined,
        milestoneRowContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: milestoneKey(projectId) }),
  });
}

export function useUpdateMilestone(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    mutationKey: ["projects", "milestones", "update"],
    mutationFn: ({
      milestoneId,
      ...input
    }: UpdateMilestoneInput & { milestoneId: number }) =>
      apiClient.patch<ProjectMilestone>(
        `/build/${projectId}/milestones/${milestoneId}`,
        input,
        undefined,
        milestoneRowContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: milestoneBaseKey(projectId),
      }),
  });
}

export function useDeleteMilestone(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    mutationKey: ["projects", "milestones", "delete"],
    mutationFn: (milestoneId: number) =>
      apiClient.delete<void>(
        `/build/${projectId}/milestones/${milestoneId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: milestoneBaseKey(projectId),
      }),
  });
}

export function useProjectBudget(projectId: number) {
  const canManage = useCan("build:manage");
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.budget(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectBudget>(
        `/build/${projectId}/budget`,
        undefined,
        signal,
        projectBudgetContract,
      ),
    enabled: canManage && !!projectId,
    staleTime: 60_000,
  });
}

export function useUpdateProjectBudget(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", "budget", "update"],
    mutationFn: (budget: number) =>
      apiClient.patch<ProjectBudgetUpdate>(
        `/build/${projectId}/budget`,
        { budget },
        undefined,
        projectBudgetUpdateContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.budget(projectId),
      }),
  });
}
