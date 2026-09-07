"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useCan } from "@/hooks/api/access";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type { WorkflowSecret, WorkflowCursorPage } from "./workflows-types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const workflowSecretListContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowSecretListContract),
);
const workflowSecretCreateContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowSecretCreateContract),
);


interface CreateSecretInput {
  name: string;
  value: string;
  description?: string;
}

function assertPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission for this workflow action.");
}

/**
 * `GET /workflows/secrets` is a keyset page, not a list. See `useAllSchedules` — the
 * same silent truncation, on the surface where a missing row is a secret the operator
 * believes they deleted.
 */
export function useGlobalSecrets() {
  const canManage = useCan("workflows:secrets:manage");
  return useInfiniteQuery({
    queryKey: [...supportAndWorkflowsQueryKeys.workflows.all, "global-secrets"] as const,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<WorkflowCursorPage<WorkflowSecret>>(
        "/workflows/secrets",
        pageParam === undefined ? undefined : { cursor: pageParam },
        signal,
        workflowSecretListContract,
      ),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (last) =>
      last.pagination.hasMore ? (last.pagination.nextCursor ?? undefined) : undefined,
    staleTime: 30_000,
    enabled: canManage,
  });
}

export function useCreateGlobalSecret() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:secrets:manage");
  return useAuthorizedMutation("workflows:secrets:manage", {
    mutationKey: ["create", "global", "secret"],
    mutationFn: (input: CreateSecretInput) => {
      assertPermission(canManage);
      return apiClient.post<WorkflowSecret>("/workflows/secrets", input, undefined, workflowSecretCreateContract);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...supportAndWorkflowsQueryKeys.workflows.all, "global-secrets"] }),
  });
}

export function useDeleteGlobalSecret() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:secrets:manage");
  return useAuthorizedMutation("workflows:secrets:manage", {
    mutationKey: ["delete", "global", "secret"],
    mutationFn: (secretId: string) => {
      assertPermission(canManage);
      return apiClient.delete<{ success: boolean }>(`/workflows/secrets/${secretId}`);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...supportAndWorkflowsQueryKeys.workflows.all, "global-secrets"] }),
  });
}

