"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  CalendarApiScope,
  CalendarDeveloperCredentialPage,
  CreateCalendarDeveloperCredentialResult,
} from "./calendar-developer-schema";

const pageContract = lazyContract(() => import("./calendar-developer-schema").then((module) => module.calendarDeveloperCredentialPageContract));
const createContract = lazyContract(() => import("./calendar-developer-schema").then((module) => module.createCalendarDeveloperCredentialContract));
const revokeContract = lazyContract(() => import("./calendar-developer-schema").then((module) => module.revokeCalendarDeveloperCredentialContract));
const keys = { all: ["calendar", "developer", "credentials"] as const };

export function useCalendarDeveloperCredentials(cursor?: string) {
  return useGatedQuery("calendar:admin:manage", {
    queryKey: [...keys.all, cursor ?? null],
    queryFn: ({ signal }) => apiClient.get<CalendarDeveloperCredentialPage>("/calendar/admin/developer/credentials", { limit: 20, cursor }, signal, pageContract),
    staleTime: 30_000,
  });
}

export function useCreateCalendarDeveloperCredential() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: ["calendar", "developer", "create-credential"],
    mutationFn: (input: { name: string; description: string | null; scopes: CalendarApiScope[]; expiresAt: string }) => apiClient.post<CreateCalendarDeveloperCredentialResult>("/calendar/admin/developer/credentials", input, undefined, createContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useRevokeCalendarDeveloperCredential() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: ["calendar", "developer", "revoke-credential"],
    mutationFn: (credentialId: string) => apiClient.post<{ success: true }>(`/calendar/admin/developer/credentials/${credentialId}/revoke`, undefined, undefined, revokeContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
}
