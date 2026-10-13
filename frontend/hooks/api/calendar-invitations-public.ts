"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";

const calendarInvitationContract = z.object({
  id: z.string().uuid(),
  title: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  role: z.enum(["organizer", "required", "optional"]),
  rsvpStatus: z.enum(["pending", "accepted", "tentative", "declined"]),
  meetingUrl: z.string().nullable(),
});

export type PublicCalendarInvitation = z.infer<typeof calendarInvitationContract>;
export type PublicCalendarInvitationPurpose = "rsvp" | "join";
export type PublicCalendarInvitationRsvp = "accepted" | "tentative" | "declined";

function queryKey(purpose: PublicCalendarInvitationPurpose, token: string) {
  return ["public", "calendar", "invitation", purpose, token] as const;
}

export function usePublicCalendarInvitation(
  purpose: PublicCalendarInvitationPurpose,
  token: string,
) {
  return useQuery({
    queryKey: queryKey(purpose, token),
    queryFn: ({ signal }) => apiClient.get<PublicCalendarInvitation>(
      `/public/calendar/invitations/${purpose}`,
      { token },
      signal,
      calendarInvitationContract,
    ),
    enabled: Boolean(token),
    retry: false,
    staleTime: 0,
  });
}

export function usePublicCalendarInvitationRsvp(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["public", "calendar", "invitation", "rsvp", token],
    mutationFn: (status: PublicCalendarInvitationRsvp) => apiClient.post<PublicCalendarInvitation>(
      "/public/calendar/invitations/rsvp",
      { token, status },
      undefined,
      calendarInvitationContract,
    ),
    onSuccess: (invitation) => {
      queryClient.setQueryData(queryKey("rsvp", token), invitation);
    },
  });
}
