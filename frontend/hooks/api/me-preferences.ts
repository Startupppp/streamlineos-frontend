"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import type { Language } from "@/lib/i18n/languages";

const myPreferencesContract = lazyContract(() =>
  import("@/hooks/api/me-preferences-schema").then((m) => m.myPreferencesContract),
);
const updateMyPreferencesContract = lazyContract(() =>
  import("@/hooks/api/me-preferences-schema").then((m) => m.updateMyPreferencesContract),
);

export interface MyPreferences {
  language: Language;
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

export function useUpdateMyLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["me", "preferences", "language"],
    mutationFn: (language: Language) =>
      apiClient.patch<{ success: true }>(
        "/me/preferences",
        { language },
        undefined,
        updateMyPreferencesContract,
      ),
    onMutate: async (language) => {
      await qc.cancelQueries({ queryKey: myPreferencesKey, exact: true });
      const previous = qc.getQueryData<MyPreferences>(myPreferencesKey);
      qc.setQueryData<MyPreferences>(myPreferencesKey, { language });
      return { previous };
    },
    onError: (_error, _language, context) => {
      qc.setQueryData(myPreferencesKey, context?.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: myPreferencesKey, exact: true });
    },
  });
}
