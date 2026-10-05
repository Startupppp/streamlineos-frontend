"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { z } from "zod";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { IntakeRequest } from "@/types/projects";

const routeIntakeContract = lazyContract(() =>
  Promise.resolve(z.object({ intakeId: z.number().int(), created: z.boolean() }).strict()),
);

export interface RouteFeedbucketToIntakeInput {
  submissionId: number;
  projectId: number;
}

export function useRouteFeedbucketToIntake() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("feedbucket:submissions:manage", {
    mutationKey: ["feedbucket", "submissions", "route-to-intake"],
    mutationFn: ({ submissionId }: RouteFeedbucketToIntakeInput) =>
      apiClient.post<{ intakeId: number; created: boolean }>(
        `/feedbucket/submissions/${submissionId}/route-to-intake`,
        {},
        undefined,
        routeIntakeContract,
      ),
    onSuccess: (_result: { intakeId: number; created: boolean }, variables: RouteFeedbucketToIntakeInput) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.intake(variables.projectId),
      });
    },
  });
}

const intakeItemContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.intakeItemContract),
);

export interface AcceptIntakeRequestInput {
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
    onSuccess: (_: IntakeRequest, variables: AcceptIntakeRequestInput) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.intake(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.detail(variables.projectId),
      });
    },
  });
}
