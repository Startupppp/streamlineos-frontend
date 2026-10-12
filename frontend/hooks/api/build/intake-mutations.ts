"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { z } from "zod";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { IntakeRequest } from "@/types/projects";
import { patchIntakeListCaches } from "@/hooks/api/build/intake-cache";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";

const routeIntakeContract = lazyContract(() =>
  Promise.resolve(z.object({ intakeId: z.number().int(), created: z.boolean() }).strict()),
);

interface RouteFeedbucketToIntakeInput {
  submissionId: number;
  projectId: number;
  projectChosen?: boolean;
}

export function useRouteFeedbucketToIntake() {
  const queryClient = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("feedbucket:submissions:manage", {
    mutationKey: ["feedbucket", "submissions", "route-to-intake"],
    mutationFn: ({ submissionId, projectId, projectChosen }: RouteFeedbucketToIntakeInput) =>
      apiClient.post<{ intakeId: number; created: boolean }>(
        `/feedbucket/submissions/${submissionId}/route-to-intake`,
        projectChosen ? { projectId } : {},
        operation.configFor({ submissionId, projectId }),
        routeIntakeContract,
      ),
    onSuccess: (result: { intakeId: number; created: boolean }, variables: RouteFeedbucketToIntakeInput) => {
      operation.settle();
      if (result.created) {
        void queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.intake(variables.projectId),
          refetchType: "none",
        });
      }
    },
  });
}

const intakeItemContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.intakeItemContract),
);

interface AcceptIntakeRequestInput {
  intakeRequestId: number;
  projectId: number;
  status: "accepted";
  state?: string;
  assigneeId?: string;
  cycleId?: number;
  moduleId?: number;
}

export function useAcceptIntakeRequest() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    mutationKey: ["projects", "intake", "accept"],
    mutationFn: ({ intakeRequestId, projectId, ...data }: AcceptIntakeRequestInput) =>
      apiClient.patch<IntakeRequest>(
        `/build/${projectId}/intake/${intakeRequestId}`,
        data,
        undefined,
        intakeItemContract,
      ),
    onSuccess: (accepted: IntakeRequest, variables: AcceptIntakeRequestInput) => {
      patchIntakeListCaches(queryClient, variables.projectId, accepted);
    },
  });
}
