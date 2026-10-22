"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCan, useCanState } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  ProjectMilestone as ProjectMilestoneBase,
  ProjectBudget,
  ProjectBudgetUpdate,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { milestonesQueryOptions, milestoneBaseKey } from "./milestones-read-options";
import type { MilestoneListQuery } from "./milestones-read-options";

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

export function useProjectMilestones(
  projectId: number,
  query: MilestoneListQuery = {},
) {
  const canViewState = useCanState("build:view");
  const q = query;
  return useQuery({
    ...milestonesQueryOptions(projectId, q),
    queryFn: ({ signal }) =>
      apiClient.get<MilestonePage>(
        `/build/${projectId}/milestones`,
        q,
        signal,
        milestoneListContract,
      ),
    enabled: canViewState !== "denied" && !!projectId,
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
    onSuccess: (created) => {
      qc.setQueriesData<MilestonePage>(
        { queryKey: milestoneBaseKey(projectId) },
        (old) => old ? { ...old, data: [created, ...old.data] } : old,
      );
    },
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
    onSuccess: (updated) => {
      qc.setQueriesData<MilestonePage>(
        { queryKey: milestoneBaseKey(projectId) },
        (old) => old ? { ...old, data: old.data.map((m) => m.id === updated.id ? updated : m) } : old,
      );
    },
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
    onSuccess: (_, milestoneId) => {
      qc.setQueriesData<MilestonePage>(
        { queryKey: milestoneBaseKey(projectId) },
        (old) => old ? { ...old, data: old.data.filter((m) => m.id !== milestoneId) } : old,
      );
    },
  });
}

export function projectBudgetQueryOptions(projectId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.budget(projectId),
    staleTime: 60_000,
  };
}

export function useProjectBudget(projectId: number) {
  const canManage = useCan("build:manage");
  return useQuery({
    ...projectBudgetQueryOptions(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectBudget>(
        `/build/${projectId}/budget`,
        undefined,
        signal,
        projectBudgetContract,
      ),
    enabled: canManage && !!projectId,
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
    onSuccess: (data) => {
      qc.setQueryData(
        buildWorkQueryKeys.projects.budget(projectId),
        (old: ProjectBudget | undefined) => {
          if (!old) return old;
          const remaining = data.budget - old.actualCost;
          const utilizationPct = data.budget > 0 ? Math.round((old.actualCost / data.budget) * 100) : 0;
          return { ...old, plannedBudget: data.budget, remaining, utilizationPct };
        },
      );
    },
  });
}
