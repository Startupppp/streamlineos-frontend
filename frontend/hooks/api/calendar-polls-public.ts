"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";

const calendarPollContract = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(["open", "finalizing", "finalized", "cancelled", "expired"]),
  expiresAt: z.string(),
  holdOptions: z.boolean(),
  selectedOptionId: z.string().uuid().nullable(),
  finalizedBookingId: z.string().uuid().nullable(),
  version: z.number().int().positive(),
  options: z.array(
    z.object({
      id: z.string().uuid(),
      startAt: z.string(),
      endAt: z.string(),
      status: z.enum(["proposed", "unavailable", "selected", "released"]),
      votes: z.object({
        yes: z.number().int().nonnegative(),
        maybe: z.number().int().nonnegative(),
        no: z.number().int().nonnegative(),
      }),
    }),
  ),
  viewer: z
    .object({
      voterId: z.string().uuid(),
      requirement: z.enum(["required", "optional"]),
      responses: z.record(z.string().uuid(), z.enum(["yes", "maybe", "no"])),
    })
    .nullable(),
});

export type PublicCalendarPoll = z.infer<typeof calendarPollContract>;
export type PublicCalendarPollVote = "yes" | "maybe" | "no";

function queryKey(token: string) {
  return ["public", "calendar", "poll", token] as const;
}

function pollPath(token: string) {
  return `/public/calendar/polls/${encodeURIComponent(token)}`;
}

export function usePublicCalendarPoll(token: string) {
  return useQuery({
    queryKey: queryKey(token),
    queryFn: ({ signal }) =>
      apiClient.get<PublicCalendarPoll>(
        pollPath(token),
        undefined,
        signal,
        calendarPollContract,
      ),
    enabled: Boolean(token),
    retry: false,
    staleTime: 0,
  });
}

export function usePublicCalendarPollVote(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["public", "calendar", "poll", "vote", token],
    mutationFn: (input: { optionId: string; response: PublicCalendarPollVote }) =>
      apiClient.put<PublicCalendarPoll>(
        `${pollPath(token)}/votes`,
        input,
        undefined,
        calendarPollContract,
      ),
    onSuccess: (poll) => {
      queryClient.setQueryData(queryKey(token), poll);
    },
  });
}
