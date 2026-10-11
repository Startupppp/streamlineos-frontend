import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { FormSubmissionPage } from "@/types/projects/forms";
import type { IntakeRequest, IntakeStatus, IntakeStatusCounts } from "@/types/projects";

export interface IntakePage {
  data: IntakeRequest[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
  statusCounts: IntakeStatusCounts;
}

function keyParam(queryKey: QueryKey, name: "status" | "source" | "cursor" | "intakeStatus"): string | undefined {
  const params = queryKey.at(-1);
  if (typeof params !== "object" || params === null || !(name in params)) return undefined;
  const value: unknown = Reflect.get(params, name);
  return typeof value === "string" ? value : undefined;
}

function shiftCount(
  counts: IntakeStatusCounts,
  from: IntakeStatus | null,
  to: IntakeStatus,
): IntakeStatusCounts {
  if (from === to) return counts;
  const next = { ...counts, [to]: counts[to] + 1 };
  if (from !== null) next[from] = Math.max(0, counts[from] - 1);
  return next;
}

function patchIntakePage(page: IntakePage, queryKey: QueryKey, item: IntakeRequest, previous: IntakeStatus | null): IntakePage {
  const statusFilter = keyParam(queryKey, "status");
  const belongs = statusFilter === undefined || statusFilter === item.status;
  const present = page.data.some((row) => row.id === item.id);
  let data = page.data;
  if (present) {
    data = belongs
      ? data.map((row) => (row.id === item.id ? item : row))
      : data.filter((row) => row.id !== item.id);
  } else if (belongs && previous === null && keyParam(queryKey, "cursor") === undefined) {
    data = [item, ...data];
  }
  return { ...page, data, statusCounts: shiftCount(page.statusCounts, previous, item.status) };
}

/**
 * Intake only moves an item out of `pending` (a decision) or into it (a new item),
 * so the previous status is implied by the new one.
 */
export function patchIntakeListCaches(queryClient: QueryClient, projectId: number, item: IntakeRequest): void {
  const previous: IntakeStatus | null = item.status === "pending" ? null : "pending";
  for (const [queryKey, page] of queryClient.getQueriesData<IntakePage>({
    queryKey: buildWorkQueryKeys.projects.intake(projectId),
  })) {
    if (!page) continue;
    const sourceFilter = keyParam(queryKey, "source");
    if (sourceFilter !== undefined && sourceFilter !== item.source) continue;
    queryClient.setQueryData<IntakePage>(queryKey, patchIntakePage(page, queryKey, item, previous));
  }

  const submissionId = item.formSubmissionId;
  if (submissionId === null) return;
  const submissionPages = {
    queryKey: buildWorkQueryKeys.projects.forms.list(projectId),
    predicate: (query: { queryKey: QueryKey }) => query.queryKey.includes("submissions"),
  };
  for (const [queryKey, page] of queryClient.getQueriesData<FormSubmissionPage>(submissionPages)) {
    if (!page?.data.some((row) => row.id === submissionId)) continue;
    const statusFilter = keyParam(queryKey, "intakeStatus");
    const data = statusFilter !== undefined && statusFilter !== item.status
      ? page.data.filter((row) => row.id !== submissionId)
      : page.data.map((row) =>
          row.id === submissionId
            ? { ...row, intake: { id: item.id, status: item.status, linkedTicket: row.intake?.linkedTicket ?? null } }
            : row,
        );
    queryClient.setQueryData<FormSubmissionPage>(queryKey, { ...page, data });
  }
  if (item.linkedWorkItemId !== null) {
    void queryClient.invalidateQueries({ ...submissionPages, refetchType: "none" });
  }
}
