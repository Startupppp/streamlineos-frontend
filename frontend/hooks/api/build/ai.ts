"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type {
  ProjectSummaryResult,
  ProjectRisksResult,
  ClientUpdateResult,
  PlanResult,
  ExtractTasksResult,
  AskResult,
  WeeklyUpdateResult,
  ChangeImpactResult,
} from "@/types/projects/ai";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AiAbortInput } from "@/hooks/api/ai-abort";


const projectSummaryContract = lazyContract(() =>
  import("@/hooks/api/build/ai-schema").then((m) => m.projectSummaryContract),
);
const projectRisksContract = lazyContract(() =>
  import("@/hooks/api/build/ai-schema").then((m) => m.projectRisksContract),
);
const projectClientUpdateContract = lazyContract(() =>
  import("@/hooks/api/build/ai-schema").then((m) => m.projectClientUpdateContract),
);
const projectPlanContract = lazyContract(() =>
  import("@/hooks/api/build/ai-schema").then((m) => m.projectPlanContract),
);
const projectExtractTasksContract = lazyContract(() =>
  import("@/hooks/api/build/ai-schema").then((m) => m.projectExtractTasksContract),
);
const projectAskContract = lazyContract(() =>
  import("@/hooks/api/build/ai-schema").then((m) => m.projectAskContract),
);
const weeklyUpdateContract = lazyContract(() =>
  import("@/hooks/api/build/ai-schema").then((m) => m.weeklyUpdateContract),
);
const changeImpactContract = lazyContract(() =>
  import("@/hooks/api/build/ai-schema").then((m) => m.changeImpactContract),
);

export function useProjectAiSummary(pid: number) {
  return useAuthorizedMutation<ProjectSummaryResult, Error, AiAbortInput | void>(
    "build:ai:use",
    {
      mutationKey: ["projects", pid, "ai", "summary"],
      mutationFn: (input) =>
        apiClient.post<ProjectSummaryResult>(`/ai/projects/${pid}/summary`, undefined, { signal: input?.signal }, projectSummaryContract),
    },
  );
}

export function useProjectAiRisks(pid: number) {
  return useAuthorizedMutation<ProjectRisksResult, Error, AiAbortInput | void>(
    "build:ai:use",
    {
      mutationKey: ["projects", pid, "ai", "risks"],
      mutationFn: (input) =>
        apiClient.post<ProjectRisksResult>(`/ai/projects/${pid}/risks`, undefined, { signal: input?.signal }, projectRisksContract),
    },
  );
}

export function useDraftClientUpdate(pid: number) {
  return useAuthorizedMutation<ClientUpdateResult, Error, AiAbortInput | void>(
    "build:ai:use",
    {
      mutationKey: ["projects", pid, "ai", "client-update"],
      mutationFn: (input) =>
        apiClient.post<ClientUpdateResult>(`/ai/projects/${pid}/client-update`, undefined, { signal: input?.signal }, projectClientUpdateContract),
    },
  );
}

export function usePlanFromPrompt(pid: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", pid, "ai", "plan"],
    mutationFn: ({ signal, ...input }: { prompt: string } & AiAbortInput) =>
      apiClient.post<PlanResult>(`/ai/projects/${pid}/plan`, input, { signal }, projectPlanContract),
  });
}

export function useExtractTasks(pid: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", pid, "ai", "extract-tasks"],
    mutationFn: ({ signal, ...input }: { text: string } & AiAbortInput) =>
      apiClient.post<ExtractTasksResult>(`/ai/projects/${pid}/extract-tasks`, input, { signal }, projectExtractTasksContract),
  });
}

export function useAskProjectAi(pid: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", pid, "ai", "ask"],
    mutationFn: ({ signal, ...input }: { question: string } & AiAbortInput) =>
      apiClient.post<AskResult>(`/ai/projects/${pid}/ask`, input, { signal }, projectAskContract),
  });
}

type WeeklyUpdateInput = { startDate?: string; endDate?: string } & AiAbortInput;

export function useWeeklyUpdate(pid: number) {
  return useAuthorizedMutation<WeeklyUpdateResult, Error, WeeklyUpdateInput | void>(
    "build:ai:use",
    {
      mutationKey: ["projects", pid, "ai", "weekly-update"],
      mutationFn: (input) => {
        const { signal, ...body } = input ?? {};
        return apiClient.post<WeeklyUpdateResult>(
          `/ai/projects/${pid}/weekly-update`,
          body,
          { signal },
          weeklyUpdateContract,
        );
      },
    },
  );
}

export function useChangeImpact(pid: number) {
  return useAuthorizedMutation<ChangeImpactResult, Error, AiAbortInput | void>(
    "build:ai:use",
    {
      mutationKey: ["projects", pid, "ai", "change-impact"],
      mutationFn: (input) =>
        apiClient.post<ChangeImpactResult>(`/ai/projects/${pid}/change-impact`, undefined, { signal: input?.signal }, changeImpactContract),
    },
  );
}
