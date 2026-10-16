"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useEffect, useRef } from "react";
import { streamAiResult, type AiResultStreamOptions } from "@/hooks/api/ai-result-stream";
import { kbAskResultSchema, type KbAskResult } from "./ask-result-schema";
import type { KbAiFeedbackInput } from "@/types/kb";
import { KB_PAGE_STATUSES } from "./kb-analytics-schema";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import type { KbAskPageOwnersPage } from "./ask-result-schema";

const kbAiFeedbackContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-ai-schema").then((m) => m.kbAiFeedbackContract),
);

const kbAskPageOwnersContract = lazyContract(() =>
  import("@/hooks/api/kb/ask-result-schema").then((m) => m.kbAskPageOwnersContract),
);

export function useKbAskPageOwners(search: string, selectedMembershipId?: number, enabled = true) {
  const canView = useCan("kb:pages:view");
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: knowledgeAndSurveysQueryKeys.kb.askPageOwners(search, selectedMembershipId),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<KbAskPageOwnersPage>(
        "/kb/pages/owners",
        { search: search || undefined, cursor: pageParam, limit: 50, selectedMembershipId },
        signal,
        kbAskPageOwnersContract,
      ),
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    enabled: enabled && canView,
    staleTime: 30_000,
  });
}

export type KbAskStatusScope = Exclude<
  (typeof KB_PAGE_STATUSES)[number],
  "archived"
>;

export const KB_ASK_STATUS_SCOPES: readonly KbAskStatusScope[] =
  KB_PAGE_STATUSES.filter(
    (status): status is KbAskStatusScope => status !== "archived",
  );

export interface KbAskScopedInput {
  question: string;
  spaceId?: number;
  conversationId?: number;
  sourceIds?: number[];
  pageIds?: number[];
  verifiedOnly?: boolean;
  ownerMembershipId?: number;
  status?: KbAskStatusScope;
}

export function useKbAsk() {
  const operation = useIdempotentOperation();
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  function stop() { controllerRef.current?.abort(); }
  function resetAttempt() { if (!controllerRef.current) operation.settle(); }
  const mutation = useAuthorizedMutation("kb:ai:generate", {
    mutationKey: ["kb", "ask"],
    mutationFn: async ({ signal, onToken, ...input }: KbAskScopedInput & AiResultStreamOptions): Promise<KbAskResult> => {
      if (controllerRef.current) throw new Error("An answer is already being generated");
      const controller = new AbortController();
      controllerRef.current = controller;
      function handleAbort() { controller.abort(); }
      if (signal?.aborted) controller.abort();
      signal?.addEventListener("abort", handleAbort, { once: true });
      try {
        return await streamAiResult({ path: "/kb/ask/stream", body: input, schema: kbAskResultSchema, signal: controller.signal, onToken, headers: operation.configFor(input).headers });
      } finally {
        signal?.removeEventListener("abort", handleAbort);
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    onSuccess: () => {
      operation.settle();
    },
  });
  return { ...mutation, stop, resetAttempt };
}

export function useKbAiAnswerFeedback() {
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "ai-feedback"],
    mutationFn: (input: KbAiFeedbackInput) =>
      apiClient.post<{ success: boolean }>("/kb/ai/feedback", input, operation.configFor(input), kbAiFeedbackContract),
    onSuccess: () => operation.settle(),
  });
}

export function useCreateKbKnowledgeGap() {
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "ask", "knowledge-gap"],
    mutationFn: (input: { question: string; spaceId?: number }) =>
      apiClient.post<{ success: boolean }>("/kb/ask/knowledge-gap", input, operation.configFor(input), kbAiFeedbackContract),
    onSuccess: () => operation.settle(),
  });
}
