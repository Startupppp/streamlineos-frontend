"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { IDEMPOTENCY_HEADER } from "@/lib/idempotency-key";
import type { AttendanceRegularization } from "@/hooks/api/hr/attendance";

const regularizationQueueC = lazyContract(() =>
  import("@/hooks/api/hr/attendance-regularization-queue-schema").then(
    (m) => m.regularizationQueueContract,
  ),
);
const regularizationApplyC = lazyContract(() =>
  import("@/hooks/api/hr/attendance-regularization-queue-schema").then(
    (m) => m.regularizationApplyContract,
  ),
);
const regularizationRejectC = lazyContract(() =>
  import("@/hooks/api/hr/attendance-regularization-queue-schema").then(
    (m) => m.regularizationRejectContract,
  ),
);

const REGULARIZATIONS_KEY = [
  ...humanResourcesQueryKeys.hr.all,
  "regularizations",
] as const;

export interface RegularizationQueuePage {
  data: AttendanceRegularization[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface RegularizationQueueParams {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  userId?: string;
  startDate?: string;
  endDate?: string;
  cursor?: string;
  limit?: number;
}

export function useHrRegularizationQueue(
  params: RegularizationQueueParams = {},
  options?: { enabled?: boolean },
) {
  return useGatedQuery("hr:attendance:view", {
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "regularizations",
      "queue",
      params,
    ],
    queryFn: ({ signal }) =>
      apiClient.get<RegularizationQueuePage>(
        "/hr/attendance/regularizations",
        params,
        signal,
        regularizationQueueC,
      ),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export interface RegularizationApplyResult {
  success: true;
  monthKey: string;
  payrollInputRebuild: boolean;
}

export function useApplyRegularization() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<RegularizationApplyResult, Error, number>(
    "hr:attendance:manage",
    {
      mutationKey: ["hr", "regularization", "apply"],
      mutationFn: (regularizationId) =>
        apiClient.post<RegularizationApplyResult>(
          `/hr/attendance/regularizations/${regularizationId}/apply`,
          undefined,
          undefined,
          regularizationApplyC,
        ),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: REGULARIZATIONS_KEY });
      },
    },
  );
}

export function useRejectRegularization() {
  const queryClient = useQueryClient();
  return useAuthorizedIdempotentMutation<
    { success: true },
    Error,
    { regularizationId: number; rejectionReason: string }
  >("hr:attendance:manage", {
    mutationKey: ["hr", "regularization", "reject"],
    mutationFn: ({ regularizationId, rejectionReason }, idempotencyKey) =>
      apiClient.post<{ success: true }>(
        `/hr/attendance/regularizations/${regularizationId}/reject`,
        { rejectionReason },
        { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } },
        regularizationRejectC,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REGULARIZATIONS_KEY });
    },
  });
}
