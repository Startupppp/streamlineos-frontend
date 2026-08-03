import { useMutation } from "@tanstack/react-query";
import { portalApiClient } from "@/lib/portal-api-client";
import type { AcceptInvitationResponse } from "@/features/portal/lib/portal-types";

export function useAcceptInvitation() {
  return useMutation({
    mutationKey: ["portal", "accept-invitation"],
    mutationFn: (inviteToken: string) =>
      portalApiClient.post<AcceptInvitationResponse>(
        "/portal/auth/accept-invitation",
        { token: inviteToken },
        { authenticated: false },
      ),
  });
}
