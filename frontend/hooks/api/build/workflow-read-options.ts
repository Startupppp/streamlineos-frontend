import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function workflowTransitionsQueryOptions(projectId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.workflow.transitions(projectId),
    staleTime: 60_000,
  } as const;
}
