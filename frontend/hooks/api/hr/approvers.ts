"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { ApprovalRequestKind, ApprovalRoute } from "@/hooks/api/hr/approval-route-schema";

const approvalRouteLazy = lazyContract(() =>
  import("@/hooks/api/hr/approval-route-schema").then((m) => m.approvalRouteContract),
);

export function useMyApprover(kind: ApprovalRequestKind, options?: { enabled?: boolean }) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.myApprover(kind),
    queryFn: ({ signal }) => apiClient.get<ApprovalRoute>(`/me/approvers/${kind}`, undefined, signal, approvalRouteLazy),
    enabled: !!orgId && (options?.enabled ?? true),
    staleTime: 60_000,
    ...INLINE_READ_ERROR,
  });
}
