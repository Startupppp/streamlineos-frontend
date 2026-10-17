import { useMutation } from "@tanstack/react-query";
import { portalApiClient } from "@/lib/portal-api-client";
import { acceptInvitationResponseSchema } from "./portal-auth-schema";

export function useAcceptInvitation() {
  return useMutation({
    mutationKey: ["portal", "accept-invitation"],
    mutationFn: async (inviteToken: string) => {
      const raw = await portalApiClient.post<unknown>(
        "/portal/auth/accept-invitation",
        { token: inviteToken },
        { authenticated: false },
      );
      return acceptInvitationResponseSchema.parse(raw);
    },
  });
}
