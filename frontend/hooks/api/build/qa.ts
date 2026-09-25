"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  TestSuite,
  TestCase,
  TestRun,
  TestRunListItem,
  TestRunDetail,
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
  status?: string;
  cursor?: number;
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
    placeholderData: keepPreviousData,
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
  if (filters?.status) params["status"] = filters.status;
  if (filters?.cursor !== undefined) params["cursor"] = String(filters.cursor);

  return useQuery<IdCursorPage<TestRunListItem>>({
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
  return useQuery<TestRunDetail>({
    queryKey: buildWorkQueryKeys.projects.qa.run(projectId ?? 0, runId ?? 0),
    queryFn: ({ signal }) => apiClient.get<TestRunDetail>(`/build/${projectId}/test-runs/${runId}`, undefined, signal, testRunDetailContract),
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
      apiClient.patch<unknown>(
        `/build/${projectId}/test-runs/${runId}/results/${resultId}`,
        data,
        undefined,
        testRunResultRowContract,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.qa.run(vars.projectId, vars.runId) });
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
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.qa.run(vars.projectId, vars.runId) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.bugs.list(vars.projectId) });
    },
  });
}
