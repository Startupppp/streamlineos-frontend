import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { WaitlistPayload } from "@/features/landing/waitlist/waitlist-schema";

export function useJoinWaitlist() {
  return useMutation({
    mutationFn: (body: WaitlistPayload) => apiClient.post<{ ok: true }>("/public/waitlist", body),
  });
}
