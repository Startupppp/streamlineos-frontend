"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  TestSuite,
  TestCase,
  TestRun,
  TestRunDetail,
  Bug,
  CreateTestSuiteInput,
  UpdateTestSuiteInput,
  CreateTestCaseInput,
  UpdateTestCaseInput,
  CreateTestRunInput,
  UpdateTestRunInput,
  UpdateTestResultInput,
} from "@/types/projects";

interface TestCaseFilters {
  q?: string;
  suiteId?: number;
  priority?: string;
  automationStatus?: string;
}

interface TestRunFilters {
  status?: string;
}

export function useTestSuites(projectId?: number) {
  return useQuery<TestSuite[]>({
    queryKey: queryKeys.projects.qa.suites(projectId),
    queryFn: () => apiClient.get<TestSuite[]>(`/projects/${projectId}/test-suites`),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateTestSuite() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "qa", "suites", "create"],
    mutationFn: ({ projectId, ...data }: CreateTestSuiteInput & { projectId: number }) =>
      apiClient.post<TestSuite>(`/projects/${projectId}/test-suites`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.qa.suites(vars.projectId) });
    },
  });
}

export function useUpdateTestSuite() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "qa", "suites", "update"],
    mutationFn: ({
      projectId,
      id,
      ...data
    }: UpdateTestSuiteInput & { projectId: number; id: number }) =>
      apiClient.patch<TestSuite>(`/projects/${projectId}/test-suites/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.qa.suites(vars.projectId) });
    },
  });
}

export function useDeleteTestSuite() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "qa", "suites", "delete"],
    mutationFn: ({ projectId, id }: { projectId: number; id: number }) =>
      apiClient.delete<unknown>(`/projects/${projectId}/test-suites/${id}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.qa.suites(vars.projectId) });
    },
  });
}

export function useTestCases(projectId?: number, filters?: TestCaseFilters) {
  const params: Record<string, string> = {};
  if (filters?.q) params["q"] = filters.q;
  if (filters?.suiteId !== undefined) params["suiteId"] = String(filters.suiteId);
  if (filters?.priority) params["priority"] = filters.priority;
  if (filters?.automationStatus) params["automationStatus"] = filters.automationStatus;

  return useQuery<TestCase[]>({
    queryKey: queryKeys.projects.qa.cases(projectId, filters),
    queryFn: () => apiClient.get<TestCase[]>(`/projects/${projectId}/test-cases`, params),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateTestCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "qa", "cases", "create"],
    mutationFn: ({ projectId, ...data }: CreateTestCaseInput & { projectId: number }) =>
      apiClient.post<TestCase>(`/projects/${projectId}/test-cases`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.qa.cases(vars.projectId) });
    },
  });
}

export function useUpdateTestCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "qa", "cases", "update"],
    mutationFn: ({
      projectId,
      id,
      ...data
    }: UpdateTestCaseInput & { projectId: number; id: number }) =>
      apiClient.patch<TestCase>(`/projects/${projectId}/test-cases/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.qa.cases(vars.projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.qa.case(vars.projectId, vars.id) });
    },
  });
}

export function useDeleteTestCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "qa", "cases", "delete"],
    mutationFn: ({ projectId, id }: { projectId: number; id: number }) =>
      apiClient.delete<unknown>(`/projects/${projectId}/test-cases/${id}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.qa.cases(vars.projectId) });
    },
  });
}

export function useTestRuns(projectId?: number, filters?: TestRunFilters) {
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;

  return useQuery<TestRun[]>({
    queryKey: queryKeys.projects.qa.runs(projectId, filters?.status),
    queryFn: () => apiClient.get<TestRun[]>(`/projects/${projectId}/test-runs`, params),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useTestRunDetail(projectId?: number, runId?: number) {
  return useQuery<TestRunDetail>({
    queryKey: queryKeys.projects.qa.run(projectId, runId),
    queryFn: () => apiClient.get<TestRunDetail>(`/projects/${projectId}/test-runs/${runId}`),
    enabled: !!projectId && !!runId,
    staleTime: 30_000,
  });
}

export function useCreateTestRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "qa", "runs", "create"],
    mutationFn: ({ projectId, ...data }: CreateTestRunInput & { projectId: number }) =>
      apiClient.post<TestRun>(`/projects/${projectId}/test-runs`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.qa.runs(vars.projectId) });
    },
  });
}

export function useUpdateTestRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "qa", "runs", "update"],
    mutationFn: ({
      projectId,
      id,
      ...data
    }: UpdateTestRunInput & { projectId: number; id: number }) =>
      apiClient.patch<TestRun>(`/projects/${projectId}/test-runs/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.qa.runs(vars.projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.qa.run(vars.projectId, vars.id) });
    },
  });
}

export function useDeleteTestRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "qa", "runs", "delete"],
    mutationFn: ({ projectId, id }: { projectId: number; id: number }) =>
      apiClient.delete<unknown>(`/projects/${projectId}/test-runs/${id}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.qa.runs(vars.projectId) });
    },
  });
}

export function useUpdateTestResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "qa", "results", "update"],
    mutationFn: ({
      projectId,
      runId,
      resultId,
      ...data
    }: UpdateTestResultInput & { projectId: number; runId: number; resultId: number }) =>
      apiClient.patch<unknown>(
        `/projects/${projectId}/test-runs/${runId}/results/${resultId}`,
        data,
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.qa.run(vars.projectId, vars.runId) });
    },
  });
}

export function useCreateBugFromResult() {
  const qc = useQueryClient();
  return useMutation({
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
        `/projects/${projectId}/test-runs/${runId}/results/${resultId}/bug`,
        data,
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.qa.run(vars.projectId, vars.runId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.bugs.list(vars.projectId) });
    },
  });
}
