"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { ProjectSummaryResult } from "@/types/projects/ai";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AiAbortInput } from "@/hooks/api/ai-abort";

const projectSummaryContract = lazyContract(() =>
  import("@/hooks/api/build/ai-schema").then((m) => m.projectSummaryContract),
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
