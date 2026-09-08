"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useCan } from "@/hooks/api/access";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type { WorkflowSchedule, WorkflowCursorPage } from "./workflows-types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const workflowScheduleListContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowScheduleListContract),
);
const workflowScheduleUpdateContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowScheduleUpdateContract),
);


interface UpdateScheduleInput {
  cronExpression?: string;
  timezone?: string;
  isEnabled?: boolean;
}

function assertPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission for this workflow action.");
}

/**
 * `GET /workflows/schedules` is a keyset page, not a list.
 *
 * The hook read it with a plain `useQuery` and the page rendered `data.data`, so an
 * organisation with more schedules than one page saw a silently truncated list with
 * no indication anything was missing — `pagination.nextCursor` came back on every
 * response and nothing ever asked for it.
 */
export function useAllSchedules() {
  const canManage = useCan("workflows:schedules:manage");
  return useInfiniteQuery({
    queryKey: [...supportAndWorkflowsQueryKeys.workflows.all, "all-schedules"] as const,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<WorkflowCursorPage<WorkflowSchedule>>(
        "/workflows/schedules",
        pageParam === undefined ? undefined : { cursor: pageParam },
        signal,
        workflowScheduleListContract,
      ),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (last) =>
      last.pagination.hasMore ? (last.pagination.nextCursor ?? undefined) : undefined,
    staleTime: 30_000,
    enabled: canManage,
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:schedules:manage");
  return useAuthorizedMutation("workflows:schedules:manage", {
    mutationKey: ["update", "schedule"],
    mutationFn: ({
      workflowId,
      scheduleId,
      ...input
    }: UpdateScheduleInput & { workflowId: string; scheduleId: string }) => {
      assertPermission(canManage);
      return apiClient.patch<WorkflowSchedule>(
        `/workflows/${workflowId}/schedules/${scheduleId}`,
        input,
        undefined,
        workflowScheduleUpdateContract,
      );
    },
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.workflows.schedules(variables.workflowId) }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:schedules:manage");
  return useAuthorizedMutation("workflows:schedules:manage", {
    mutationKey: ["delete", "schedule"],
    mutationFn: ({ workflowId, scheduleId }: { workflowId: string; scheduleId: string }) => {
      assertPermission(canManage);
      return apiClient.delete<void>(
        `/workflows/${workflowId}/schedules/${scheduleId}`,
        undefined,
        undefined,
        noContentContract,
      );
    },
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.workflows.schedules(variables.workflowId) }),
  });
}
