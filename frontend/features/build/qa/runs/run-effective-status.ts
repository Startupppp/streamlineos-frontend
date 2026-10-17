import type { TestRun } from "@/types/projects";

interface RunExecutionCounts {
  total: number;
  notRun: number;
}

export function deriveRunDisplayStatus(
  storedStatus: TestRun["status"],
  counts: RunExecutionCounts,
): TestRun["status"] {
  if (storedStatus !== "not_started") return storedStatus;
  return counts.total > counts.notRun ? "in_progress" : storedStatus;
}
