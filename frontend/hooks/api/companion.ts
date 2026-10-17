"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  CompanionPolicy,
  CompanionPreference,
  CompanionPreferences,
  CompanionPrompt,
  CompanionPromptCategory,
  CompanionSnoozeMinutes,
} from "@/hooks/api/companion-schema";

const preferencesContract = lazyContract(() =>
  import("@/hooks/api/companion-schema").then(
    (m) => m.companionPreferencesContract,
  ),
);
const policyContract = lazyContract(() =>
  import("@/hooks/api/companion-schema").then((m) => m.companionPolicyContract),
);
const nextPromptContract = lazyContract(() =>
  import("@/hooks/api/companion-schema").then(
    (m) => m.companionNextPromptContract,
  ),
);
const promptResultContract = lazyContract(() =>
  import("@/hooks/api/companion-schema").then(
    (m) => m.companionPromptResultContract,
  ),
);
const promptHistoryContract = lazyContract(() =>
  import("@/hooks/api/companion-schema").then(
    (m) => m.companionPromptHistoryContract,
  ),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

const keys = collaborationQueryKeys.companion;
const PROMPT_REFRESH_MS = 2 * 60_000;
const PREFERENCES_REFRESH_MS = 60_000;

export type CompanionPreferencesPatch = Partial<
  Omit<CompanionPreference, "version" | "updatedAt">
> & { version: number };

export function useCompanionPreferences() {
  const { status } = useSession();
  return useQuery({
    queryKey: keys.preferences(),
    queryFn: ({ signal }) =>
      apiClient.get<CompanionPreferences>(
        "/companion/preferences",
        undefined,
        signal,
        preferencesContract,
      ),
    staleTime: PREFERENCES_REFRESH_MS,
    refetchInterval: PREFERENCES_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: true,
    enabled: status === "authenticated",
    retry: 1,
    ...INLINE_READ_ERROR,
  });
}

export function useUpdateCompanionPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["companion", "preferences", "update"],
    mutationFn: (patch: CompanionPreferencesPatch) =>
      apiClient.patch<CompanionPreferences>(
        "/companion/preferences",
        patch,
        undefined,
        preferencesContract,
      ),
    onSuccess: (data) => {
      qc.setQueryData(keys.preferences(), data);
      void qc.invalidateQueries({ queryKey: keys.nextPrompt(), exact: true });
    },
  });
}

export function useCompanionHeartbeat() {
  return useAuthorizedMutation("ai:chat:use", {
    mutationKey: ["companion", "activity", "heartbeat"],
    mutationFn: (input: { sessionId: string; foregroundSeconds: number }) =>
      apiClient.post<void>(
        "/companion/activity/heartbeat",
        input,
        undefined,
        noContentContract,
      ),
  });
}

export function useCompanionPolicy() {
  return useGatedQuery("ai:companion:manage", {
    queryKey: keys.policy(),
    queryFn: ({ signal }) =>
      apiClient.get<CompanionPolicy>(
        "/companion/policy",
        undefined,
        signal,
        policyContract,
      ),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateCompanionPolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("ai:companion:manage", {
    mutationKey: ["companion", "policy", "update"],
    mutationFn: (
      patch: Partial<Omit<CompanionPolicy, "version">> & { version: number },
    ) =>
      apiClient.patch<CompanionPolicy>(
        "/companion/policy",
        patch,
        undefined,
        policyContract,
      ),
    onSuccess: (data) => {
      qc.setQueryData(keys.policy(), data);
      void qc.invalidateQueries({ queryKey: keys.preferences(), exact: true });
    },
  });
}

export function useNextCompanionPrompt(enabled: boolean) {
  return useGatedQuery("ai:chat:use", {
    queryKey: keys.nextPrompt(),
    queryFn: ({ signal }) =>
      apiClient.get<{ prompt: CompanionPrompt | null }>(
        "/companion/prompts/next",
        undefined,
        signal,
        nextPromptContract,
      ),
    staleTime: 0,
    refetchInterval: PROMPT_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    enabled,
    retry: false,
    ...INLINE_READ_ERROR,
  });
}

type PromptAction =
  | { promptId: string; action: "claim" | "dismiss" }
  | { promptId: string; action: "snooze"; minutes: CompanionSnoozeMinutes };

export function useCompanionPromptAction() {
  const qc = useQueryClient();
  return useAuthorizedMutation("ai:chat:use", {
    mutationKey: ["companion", "prompts", "action"],
    mutationFn: (input: PromptAction) =>
      apiClient.post<{ prompt: CompanionPrompt }>(
        `/companion/prompts/${encodeURIComponent(input.promptId)}/${input.action}`,
        input.action === "snooze" ? { minutes: input.minutes } : undefined,
        undefined,
        promptResultContract,
      ),
    onSuccess: (_data, input) => {
      if (input.action !== "claim")
        qc.setQueryData(keys.nextPrompt(), { prompt: null });
      void qc.invalidateQueries({
        queryKey: keys.promptHistory(),
        refetchType: "active",
      });
    },
  });
}

export function useCompanionPromptHistory(
  filters: {
    category?: CompanionPromptCategory;
    status?: CompanionPrompt["status"];
  },
  cursor?: string,
) {
  return useGatedQuery("ai:chat:use", {
    queryKey: keys.promptHistory(filters, cursor),
    queryFn: ({ signal }) =>
      apiClient.get<{ items: CompanionPrompt[]; nextCursor: string | null }>(
        "/companion/prompts/history",
        { ...(cursor === undefined ? {} : { cursor }), ...filters },
        signal,
        promptHistoryContract,
      ),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}
