"use client";

import type { QueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  TestRunDetail,
  TestRunListItem,
  TestRunResult,
} from "@/types/projects";
import type { IdCursorPage } from "@/hooks/api/cursor-page-schema";

export function patchRunResult(
  qc: QueryClient,
  projectId: number,
  runId: number,
  resultId: number,
  patch: Partial<TestRunResult>,
) {
  qc.setQueryData<TestRunDetail | null>(
    buildWorkQueryKeys.projects.qa.run(projectId, runId),
    (run) => {
      if (!run) return run;
      const results = run.results.map((result) =>
        result.id === resultId ? { ...result, ...patch } : result,
      );
      const starts = run.status === "not_started" && patch.status !== undefined && patch.status !== "not_run";
      return { ...run, results, status: starts ? "in_progress" : run.status };
    },
  );
}

export function markRunListsStale(qc: QueryClient, projectId: number) {
  for (const [key] of qc.getQueriesData({ queryKey: buildWorkQueryKeys.projects.qa.runs(projectId) })) {
    if (typeof key.at(-1) === "number") continue;
    void qc.invalidateQueries({ queryKey: key, exact: true, refetchType: "none" });
  }
}

const RESULT_COUNT_FIELD: Record<
  TestRunResult["status"],
  keyof Pick<TestRunListItem, "passCount" | "failCount" | "blockedCount" | "notRunCount" | "skippedCount">
> = {
  passed: "passCount",
  failed: "failCount",
  blocked: "blockedCount",
  not_run: "notRunCount",
  skipped: "skippedCount",
};

export function patchRunListsFromResult(
  qc: QueryClient,
  projectId: number,
  runId: number,
  previousStatus: TestRunResult["status"] | undefined,
  nextStatus: TestRunResult["status"],
) {
  const previousField = previousStatus ? RESULT_COUNT_FIELD[previousStatus] : undefined;
  const nextField = RESULT_COUNT_FIELD[nextStatus];
  for (const [key, page] of qc.getQueriesData<IdCursorPage<TestRunListItem>>({
    queryKey: buildWorkQueryKeys.projects.qa.runs(projectId),
  })) {
    if (typeof key.at(-1) === "number" || !page) continue;
    qc.setQueryData<IdCursorPage<TestRunListItem>>(key, {
      ...page,
      data: page.data.map((run) => {
        if (run.id !== runId) return run;
        const counts = { ...run };
        if (previousField && previousField !== nextField) {
          counts[previousField] = Math.max(0, run[previousField] - 1);
          counts[nextField] = run[nextField] + 1;
        }
        if (nextStatus !== "not_run" && run.status === "not_started") {
          counts.status = "in_progress";
        }
        return counts;
      }),
    });
  }
}
