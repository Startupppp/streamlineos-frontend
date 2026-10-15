"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
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
const proposalListContract = lazyContract(() =>
  import("./calendar-source-actions-schema").then((module) => module.calendarSourceActionProposalListContract),
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

export function useCalendarSourceActionProposals(enabled = true) {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  return useGatedQuery("calendar:read", {
    queryKey: platformHierarchyQueryKeys.calendar.sourceActionProposals(orgId, userId),
    queryFn: ({ signal }) => apiClient.get<CalendarSourceActionProposal[]>(
      "/calendar/source-actions/proposals",
      undefined,
      signal,
      proposalListContract,
    ),
    enabled: Boolean(enabled && orgId && userId),
    staleTime: 30_000,
  });
}

export function useCalendarSourceActionProposal(proposalId: string | null) {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  return useGatedQuery("calendar:read", {
    queryKey: platformHierarchyQueryKeys.calendar.sourceActionProposal(orgId, userId, proposalId ?? ""),
    queryFn: ({ signal }) => apiClient.get<CalendarSourceActionProposal>(
      `/calendar/source-actions/proposals/${proposalId}`,
      undefined,
      signal,
      proposalContract,
    ),
    enabled: Boolean(orgId && userId && proposalId),
    staleTime: 0,
    refetchInterval: (query) => query.state.data?.status === "APPLYING" ? 5000 : false,
  });
}

export function useCreateCalendarSourceActionProposal() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  return useAuthorizedMutation("calendar:read", {
    mutationKey: ["calendar", "source-actions", "create"],
    mutationFn: (input: CreateCalendarSourceActionProposalInput) =>
      apiClient.post<CalendarSourceActionProposal>(
        "/calendar/source-actions/proposals",
        input,
        undefined,
        proposalContract,
      ),
    onSuccess: (proposal) => {
      queryClient.setQueryData(
        platformHierarchyQueryKeys.calendar.sourceActionProposal(orgId, userId, proposal.id),
        proposal,
      );
      void queryClient.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.sourceActionProposals(orgId, userId) });
    },
  });
}

export function useConfirmCalendarSourceActionProposal() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
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
        platformHierarchyQueryKeys.calendar.sourceActionProposal(orgId, userId, proposal.id),
        proposal,
      );
      void queryClient.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.sourceActionProposals(orgId, userId) });
      void queryClient.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.eventsAll });
    },
  });
}

export function useRepairCalendarSourceActionStep() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
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
        platformHierarchyQueryKeys.calendar.sourceActionProposal(orgId, userId, proposal.id),
        proposal,
      );
      void queryClient.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.sourceActionProposals(orgId, userId) });
      void queryClient.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.eventsAll });
    },
  });
}
