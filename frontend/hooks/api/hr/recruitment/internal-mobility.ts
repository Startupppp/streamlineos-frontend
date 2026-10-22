"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type {
  InternalApproval,
  InternalMyApplication,
} from "@/hooks/api/hr/recruitment/internal-mobility-schema";

export type { InternalApproval, InternalMyApplication };

const myApplicationsContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/internal-mobility-schema").then(
    (m) => m.internalMyApplicationListSchema,
  ),
);
const approvalsContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/internal-mobility-schema").then(
    (m) => m.internalApprovalListSchema,
  ),
);
const approvalResultContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/internal-mobility-schema").then(
    (m) => m.internalApprovalResultSchema,
  ),
);

export function useMyInternalApplications() {
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.internalMyApplications,
    queryFn: ({ signal }) =>
      apiClient.get<InternalMyApplication[]>(
        "/hr/recruitment/internal-mobility/my-applications",
        undefined,
        signal,
        myApplicationsContract,
      ),
    staleTime: 60_000,
  });
}

export function useInternalApprovals() {
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.internalApprovals,
    queryFn: ({ signal }) =>
      apiClient.get<InternalApproval[]>(
        "/hr/recruitment/internal-mobility/approvals",
        undefined,
        signal,
        approvalsContract,
      ),
    staleTime: 30_000,
  });
}

export interface InternalApprovalDecision {
  applicationId: number;
  decision: "APPROVED" | "DECLINED";
  note?: string;
}

export function useDecideInternalApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: humanResourcesQueryKeys.hr.internalApprovalDecision,
    mutationFn: ({ applicationId, decision, note }: InternalApprovalDecision) =>
      apiClient.post(
        `/hr/recruitment/internal-mobility/approvals/${applicationId}`,
        { decision, note },
        undefined,
        approvalResultContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.internalApprovals });
    },
  });
}
