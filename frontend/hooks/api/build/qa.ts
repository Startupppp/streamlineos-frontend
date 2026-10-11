"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { isApiError, lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type {
  TestSuite,
  TestCase,
  TestRun,
  TestRunListItem,
  TestRunDetail,
  TestRunResult,
  TestRunResultRow,
  Bug,
  CreateTestCaseInput,
  UpdateTestCaseInput,
  CreateTestRunInput,
  UpdateTestRunInput,
  UpdateTestResultInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { IdCursorPage } from "@/hooks/api/cursor-page-schema";


const testSuiteListContract = lazyContract(() =>
  import("@/hooks/api/build/qa-schema").then((m) => m.testSuiteListContract),
);
const testCasePageContract = lazyContract(() =>
  import("@/hooks/api/build/qa-schema").then((m) => m.testCasePageContract),
);
const testCaseRowContract = lazyContract(() =>
  import("@/hooks/api/build/qa-schema").then((m) => m.testCaseRowContract),
);
const testRunListPageContract = lazyContract(() =>
  import("@/hooks/api/build/qa-schema").then((m) => m.testRunListPageContract),
);
const testRunRowContract = lazyContract(() =>
  import("@/hooks/api/build/qa-schema").then((m) => m.testRunRowContract),
);
const testRunDetailContract = lazyContract(() =>
  import("@/hooks/api/build/qa-schema").then((m) => m.testRunDetailContract),
);
const testRunResultRowContract = lazyContract(() =>
  import("@/hooks/api/build/qa-schema").then((m) => m.testRunResultRowContract),
);
const bugRowContract = lazyContract(() =>
  import("@/hooks/api/build/qa-schema").then((m) => m.bugRowContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

type TestCaseFilters = {
  q?: string;
  suiteId?: number;
  priority?: string;
  automationStatus?: string;
  cursor?: number;
};

interface TestRunFilters {
  q?: string;
  status?: string;
  cursor?: number;
  failuresOnly?: boolean;
}

export function useTestSuites(projectId?: number) {
  const canView = useCan("build:qa:view");
  return useQuery<TestSuite[]>({
    queryKey: buildWorkQueryKeys.projects.qa.suites(projectId ?? 0),
    queryFn: ({ signal }) => apiClient.get<TestSuite[]>(`/build/${projectId}/test-suites`, undefined, signal, testSuiteListContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useTestCases(projectId?: number, filters?: TestCaseFilters) {
  const canView = useCan("build:qa:view");
  const params: Record<string, string> = {};
  if (filters?.q) params["q"] = filters.q;
  if (filters?.suiteId !== undefined) params["suiteId"] = String(filters.suiteId);
  if (filters?.priority) params["priority"] = filters.priority;
  if (filters?.automationStatus) params["automationStatus"] = filters.automationStatus;
  if (filters?.cursor !== undefined) params["cursor"] = String(filters.cursor);

  return useQuery<IdCursorPage<TestCase>>({
    queryKey: buildWorkQueryKeys.projects.qa.cases(
      projectId ?? 0,
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<IdCursorPage<TestCase>>(
        `/build/${projectId}/test-cases`,
        params,
        signal,
        testCasePageContract,
      ),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateTestCase() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:qa:manage", {
    mutationKey: ["projects", "qa", "cases", "create"],
    mutationFn: ({ projectId, ...data }: CreateTestCaseInput & { projectId: number }) =>
      apiClient.post<TestCase>(`/build/${projectId}/test-cases`, data, undefined, testCaseRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.qa.casesAll(vars.projectId) });
    },
  });
}

export function useUpdateTestCase() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:qa:manage", {
    mutationKey: ["projects", "qa", "cases", "update"],
    mutationFn: ({
      projectId,
      id,
      ...data
    }: UpdateTestCaseInput & { projectId: number; id: number }) =>
      apiClient.patch<TestCase>(`/build/${projectId}/test-cases/${id}`, data, undefined, testCaseRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.qa.casesAll(vars.projectId) });
    },
  });
}

export function useDeleteTestCase() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:qa:manage", {
    mutationKey: ["projects", "qa", "cases", "delete"],
    mutationFn: ({ projectId, id }: { projectId: number; id: number }) =>
      apiClient.delete<void>(`/build/${projectId}/test-cases/${id}`, undefined, undefined, noContentContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.qa.casesAll(vars.projectId) });
    },
  });
}

export function useTestRuns(projectId?: number, filters?: TestRunFilters) {
  const canView = useCan("build:qa:view");
  const params: Record<string, string> = {};
  if (filters?.q) params["q"] = filters.q;
  if (filters?.status) params["status"] = filters.status;
  if (filters?.cursor !== undefined) params["cursor"] = String(filters.cursor);
  if (filters?.failuresOnly) params["failuresOnly"] = "true";

  return useQuery<IdCursorPage<TestRunListItem>>({
    ...INLINE_READ_ERROR,
    queryKey: buildWorkQueryKeys.projects.qa.runs(
      projectId ?? 0,
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<IdCursorPage<TestRunListItem>>(
        `/build/${projectId}/test-runs`,
        params,
        signal,
        testRunListPageContract,
      ),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useTestRunDetail(projectId?: number, runId?: number) {
  const canView = useCan("build:qa:view");
  return useQuery<TestRunDetail | null>({
    queryKey: buildWorkQueryKeys.projects.qa.run(projectId ?? 0, runId ?? 0),
    queryFn: async ({ signal }) => {
      try {
        return await apiClient.get<TestRunDetail>(
          `/build/${projectId}/test-runs/${runId}`,
          undefined,
          signal,
          testRunDetailContract,
        );
      } catch (error) {
        if (!isApiError(error) || error.status !== 404) throw error;
        return null;
      }
    },
    enabled: canView && !!projectId && !!runId,
    staleTime: 30_000,
    throwOnError: false,
  });
}

export function useCreateTestRun() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:qa:manage", {
    mutationKey: ["projects", "qa", "runs", "create"],
    mutationFn: ({ projectId, ...data }: CreateTestRunInput & { projectId: number }) =>
      apiClient.post<TestRun>(`/build/${projectId}/test-runs`, data, undefined, testRunRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.qa.runs(vars.projectId) });
    },
  });
}

export function useUpdateTestRun() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:qa:manage", {
    mutationKey: ["projects", "qa", "runs", "update"],
    mutationFn: ({
      projectId,
      id,
      ...data
    }: UpdateTestRunInput & { projectId: number; id: number }) =>
      apiClient.patch<TestRun>(`/build/${projectId}/test-runs/${id}`, data, undefined, testRunRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.qa.runs(vars.projectId) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.qa.run(vars.projectId, vars.id) });
    },
  });
}

export function useDeleteTestRun() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:qa:manage", {
    mutationKey: ["projects", "qa", "runs", "delete"],
    mutationFn: ({ projectId, id }: { projectId: number; id: number }) =>
      apiClient.delete<void>(`/build/${projectId}/test-runs/${id}`, undefined, undefined, noContentContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.qa.runs(vars.projectId) });
    },
  });
}

function patchRunResult(
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

function markRunListsStale(qc: QueryClient, projectId: number) {
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

function patchRunListsFromResult(
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

export function useUpdateTestResult() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:qa:execute", {
    mutationKey: ["projects", "qa", "results", "update"],
    mutationFn: ({
      projectId,
      runId,
      resultId,
      ...data
    }: UpdateTestResultInput & { projectId: number; runId: number; resultId: number }) =>
      apiClient.patch<TestRunResultRow>(
        `/build/${projectId}/test-runs/${runId}/results/${resultId}`,
        data,
        undefined,
        testRunResultRowContract,
      ),
    onSuccess: (updated, vars) => {
      const previous = qc.getQueryData<TestRunDetail | null>(
        buildWorkQueryKeys.projects.qa.run(vars.projectId, vars.runId),
      );
      const previousStatus = previous?.results.find((result) => result.id === vars.resultId)?.status;
      patchRunResult(qc, vars.projectId, vars.runId, vars.resultId, {
        status: updated.status,
        notes: updated.notes,
        executedBy: updated.executedBy,
        executedAt: updated.executedAt,
        linkedWorkItemId: updated.linkedWorkItemId,
      });
      patchRunListsFromResult(qc, vars.projectId, vars.runId, previousStatus, updated.status);
      markRunListsStale(qc, vars.projectId);
    },
  });
}

export function useCreateBugFromResult() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:bugs:create", {
    mutationKey: ["projects", "qa", "results", "bug"],
    mutationFn: ({
      projectId,
      runId,
      resultId,
      ...data
    }: {
      projectId: number;
      runId: number;
      resultId: number;
      title?: string;
      severity?: string;
    }) =>
      apiClient.post<Bug>(
        `/build/${projectId}/test-runs/${runId}/results/${resultId}/bug`,
        data,
        undefined,
        bugRowContract,
      ),
    onSuccess: (bug, vars) => {
      patchRunResult(qc, vars.projectId, vars.runId, vars.resultId, { linkedWorkItemId: bug.id });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.bugs.list(vars.projectId) });
    },
  });
}
