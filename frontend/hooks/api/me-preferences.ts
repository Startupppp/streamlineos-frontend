"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import type { Language } from "@/lib/i18n/languages";
import { resolveOrgTimeZone } from "@/lib/date-utils";

const myPreferencesContract = lazyContract(() =>
  import("@/hooks/api/me-preferences-schema").then((m) => m.myPreferencesContract),
);
export interface MyPreferences {
  language: Language;
  timezone?: string | null;
}

const myPreferencesKey = supportAndWorkflowsQueryKeys.auth.myPreferences();

export function useMyPreferences() {
  const { status } = useSession();
  return useQuery({
    queryKey: myPreferencesKey,
    queryFn: ({ signal }) =>
      apiClient.get<MyPreferences>("/me/preferences", undefined, signal, myPreferencesContract),
    staleTime: 10 * 60_000,
    enabled: status === "authenticated",
    ...INLINE_READ_ERROR,
  });
}

export function useAccountTimeZone(): string {
  const zone = useMyPreferences().data?.timezone ?? null;
  return useMemo(() => resolveOrgTimeZone(zone), [zone]);
}

