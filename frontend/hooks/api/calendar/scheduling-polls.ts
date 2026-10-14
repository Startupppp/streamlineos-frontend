"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { calendarBookingQueryKeys } from "@/lib/query-keys/calendar-booking";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useBookingScope } from "./booking-rules";
import type { CreatedSchedulingPoll, FinalizedSchedulingPoll, SchedulingPoll, SchedulingPollList } from "./scheduling-polls-schema";

const listContract = lazyContract(() => import("./scheduling-polls-schema").then((module) => module.schedulingPollListContract));
const pollContract = lazyContract(() => import("./scheduling-polls-schema").then((module) => module.schedulingPollContract));
const createdContract = lazyContract(() => import("./scheduling-polls-schema").then((module) => module.createdSchedulingPollContract));
const finalizedContract = lazyContract(() => import("./scheduling-polls-schema").then((module) => module.finalizedSchedulingPollContract));

export interface CreateSchedulingPollInput {
  requestId: string;
  ruleId: number;
  expectedRuleVersion: number;
  title: string;
  expiresAt: string;
  holdOptions: boolean;
  options: Array<{ startAt: string; endAt: string }>;
  voters: Array<
    { kind: "member"; userId: string; requirement: "required" | "optional" } |
    { kind: "guest"; email: string; name: string | null; requirement: "required" | "optional" }
  >;
}

export function useSchedulingPolls(ruleId: number, cursor: string | null) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.polls(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId, cursor),
    queryFn: ({ signal }) => apiClient.get<SchedulingPollList>("/calendar/scheduling-polls", { ruleId: String(ruleId), ...(cursor ? { cursor } : {}) }, signal, listContract),
    enabled: Boolean(scope.orgId && scope.userId),
    staleTime: 15_000,
    ...INLINE_READ_ERROR,
  });
}

export function useSchedulingPoll(pollId: string | null) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.poll(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, pollId ?? ""),
    queryFn: ({ signal }) => apiClient.get<SchedulingPoll>(`/calendar/scheduling-polls/${encodeURIComponent(pollId ?? "")}`, undefined, signal, pollContract),
    enabled: Boolean(scope.orgId && scope.userId && pollId),
    staleTime: 15_000,
    ...INLINE_READ_ERROR,
  });
}

export function useMySchedulingPolls(cursor: string | null) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.myPolls(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, cursor),
    queryFn: ({ signal }) => apiClient.get<SchedulingPollList>("/calendar/scheduling-polls/mine", cursor ? { cursor } : undefined, signal, listContract),
    enabled: Boolean(scope.orgId && scope.userId),
    staleTime: 15_000,
    ...INLINE_READ_ERROR,
  });
}

export function useVoteSchedulingPoll() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:read", {
    mutationKey: calendarBookingQueryKeys.mutation("vote-poll"),
    mutationFn: ({ pollId, optionId, response }: { pollId: string; optionId: string; response: "yes" | "maybe" | "no" }) =>
      apiClient.put<SchedulingPoll>(`/calendar/scheduling-polls/${encodeURIComponent(pollId)}/votes`, { optionId, response }, undefined, pollContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}

export function useCreateSchedulingPoll() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: calendarBookingQueryKeys.mutation("create-poll"),
    mutationFn: (input: CreateSchedulingPollInput) => apiClient.post<CreatedSchedulingPoll>("/calendar/scheduling-polls", input, undefined, createdContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}

export function useFinalizeSchedulingPoll() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: calendarBookingQueryKeys.mutation("finalize-poll"),
    mutationFn: ({ pollId, optionId, expectedVersion }: { pollId: string; optionId: string; expectedVersion: number }) =>
      apiClient.put<FinalizedSchedulingPoll>(`/calendar/scheduling-polls/${encodeURIComponent(pollId)}/finalize`, { optionId, expectedVersion }, undefined, finalizedContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}

export function useCancelSchedulingPoll() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: calendarBookingQueryKeys.mutation("cancel-poll"),
    mutationFn: ({ pollId, expectedVersion }: { pollId: string; expectedVersion: number }) =>
      apiClient.put<SchedulingPoll>(`/calendar/scheduling-polls/${encodeURIComponent(pollId)}/cancel`, { expectedVersion }, undefined, pollContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}
