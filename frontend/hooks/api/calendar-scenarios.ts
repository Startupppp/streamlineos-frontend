"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import type { CommitmentReference } from "./calendar-commitment-schema";
import type { CreateCalendarSourceActionProposalInput } from "./calendar-source-actions";
import type { CalendarSourceActionProposal } from "./calendar-source-actions-schema";
import type { CalendarScenarioPreview } from "./calendar-scenario-schema";

const previewContract = lazyContract(() => import("./calendar-scenario-schema").then((module) => module.calendarScenarioPreviewContract));
const proposalContract = lazyContract(() => import("./calendar-source-actions-schema").then((module) => module.calendarSourceActionProposalContract));

export function usePreviewCalendarScenario() {
  return useAuthorizedMutation("calendar:read", {
    mutationKey: ["calendar", "scenario", "preview"],
    mutationFn: (input: { root: CommitmentReference; steps: CreateCalendarSourceActionProposalInput["steps"] }) =>
      apiClient.post<CalendarScenarioPreview>("/calendar/scenarios/preview", input, undefined, previewContract),
  });
}

export function useApplyCalendarScenario() {
  const qc = useQueryClient();
  return useAuthorizedMutation("calendar:read", {
    mutationKey: ["calendar", "scenario", "apply"],
    mutationFn: (input: { token: string; selected: number[]; idempotencyKey: string }) =>
      apiClient.post<CalendarSourceActionProposal>("/calendar/scenarios/apply", input, {
        headers: { "Idempotency-Key": input.idempotencyKey },
      }, proposalContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.eventsAll });
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.commitments });
    },
  });
}
