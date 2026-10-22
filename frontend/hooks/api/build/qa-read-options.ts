import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function testSuitesQueryOptions(projectId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.qa.suites(projectId),
    staleTime: 60_000,
  };
}

export function testCasesQueryOptions(projectId: number, params?: Record<string, string>) {
  return {
    queryKey: buildWorkQueryKeys.projects.qa.cases(
      projectId,
      params && Object.keys(params).length > 0 ? params : undefined,
    ),
    staleTime: 60_000,
  };
}

export function testRunDetailQueryOptions(projectId: number, runId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.qa.run(projectId, runId),
    staleTime: 30_000,
  };
}
