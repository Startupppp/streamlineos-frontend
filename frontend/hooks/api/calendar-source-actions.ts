"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  CalendarSourceActionProposal,
  CalendarSourceActionRepair,
} from "./calendar-source-actions-schema";

const proposalContract = lazyContract(() =>
  import("./calendar-source-actions-schema").then((module) => module.calendarSourceActionProposalContract),
);
const capabilitiesContract = lazyContract(() =>
  import("./calendar-source-actions-schema").then((module) => module.calendarSourceActionCapabilitiesContract),
);

export interface CreateCalendarSourceActionProposalInput {
  idempotencyKey: string;
  expiresInSeconds: number;
  steps: Array<{
    sourceKey: string;
    sourceRecordId: string;
    entityType: string;
    sourceActionId: string;
    expectedSourceVersion: string;
    intendedEffect: string;
    input: Record<string, unknown>;
  }>;
}

export function useCalendarSourceActionCapabilities() {
  return useGatedQuery("calendar:read", {
    queryKey: platformHierarchyQueryKeys.calendar.sourceActionCapabilities,
    queryFn: ({ signal }) => apiClient.get<{ sourceKeys: string[] }>(
      "/calendar/source-actions/capabilities",
      undefined,
      signal,
      capabilitiesContract,
    ),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCalendarSourceActionProposal() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:read", {
    mutationKey: ["calendar", "source-actions", "create"],
    mutationFn: (input: CreateCalendarSourceActionProposalInput) =>
      apiClient.post<CalendarSourceActionProposal>(
        "/calendar/source-actions/proposals",
        input,
        undefined,
        proposalContract,
      ),
    onSuccess: (proposal) => queryClient.setQueryData(
      platformHierarchyQueryKeys.calendar.sourceActionProposal(proposal.id),
      proposal,
    ),
  });
}

export function useConfirmCalendarSourceActionProposal() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:read", {
    mutationKey: ["calendar", "source-actions", "confirm"],
    mutationFn: ({
      proposalId,
      expectedVersion,
      decisions,
    }: {
      proposalId: string;
      expectedVersion: number;
      decisions: Array<{ stepId: string; decision: "CONFIRM" | "DECLINE" }>;
    }) => apiClient.post<CalendarSourceActionProposal>(
      `/calendar/source-actions/proposals/${proposalId}/confirm`,
      { expectedVersion, decisions },
      undefined,
      proposalContract,
    ),
    onSuccess: (proposal) => {
      queryClient.setQueryData(
        platformHierarchyQueryKeys.calendar.sourceActionProposal(proposal.id),
        proposal,
      );
      void queryClient.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.eventsAll });
    },
  });
}

export function useRepairCalendarSourceActionStep() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:read", {
    mutationKey: ["calendar", "source-actions", "repair"],
    mutationFn: ({
      proposalId,
      stepId,
      expectedStepVersion,
      action,
    }: {
      proposalId: string;
      stepId: string;
      expectedStepVersion: number;
      action: CalendarSourceActionRepair;
    }) => apiClient.post<CalendarSourceActionProposal>(
      `/calendar/source-actions/proposals/${proposalId}/steps/${stepId}/repair`,
      { expectedStepVersion, action },
      undefined,
      proposalContract,
    ),
    onSuccess: (proposal) => {
      queryClient.setQueryData(
        platformHierarchyQueryKeys.calendar.sourceActionProposal(proposal.id),
        proposal,
      );
      void queryClient.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.eventsAll });
    },
  });
}
