"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export const WAITLIST_TEAM_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-1000",
  "1000+",
] as const;

export type WaitlistTeamSize = (typeof WAITLIST_TEAM_SIZES)[number];

export type WaitlistJoinPayload = {
  name: string;
  email: string;
  company?: string;
  teamSize?: WaitlistTeamSize;
  source?: "landing" | "pricing";
};

export function useJoinWaitlistMutation() {
  return useMutation({
    mutationKey: ["public", "waitlist", "join"],
    mutationFn: (payload: WaitlistJoinPayload) =>
      apiClient.post<{ ok: true }>("/public/waitlist", payload),
    retry: false,
  });
}
