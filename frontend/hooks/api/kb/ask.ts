"use client";

import { apiClient } from "@/lib/api-client";
import type { KbAskInput, KbAskResponse, KbAiFeedbackInput } from "@/types/kb";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import type { AiAbortInput } from "@/hooks/api/ai-abort";

/**
 * The key is minted per QUESTION and released only once an answer comes back.
 *
 * `POST /kb/ask` is `@Idempotent("kb.ask")` and it spends credits: retrieval embeds the
 * query and the answer is a full provider completion. A user who hits Retry after the
 * request times out is asking the same question a second time, and without a stable key
 * the fence replays nothing — `authedFetch` mints a fallback key per HTTP call so the
 * route never 400s, but a key minted per attempt is a request id wearing the wrong name.
 *
 * `settle()` on success is what keeps a deliberate re-ask a real re-ask: once the answer
 * has been delivered the next identical question mints a new key rather than replaying a
 * stale answer over a corpus that may have changed. `signal` is excluded from the
 * signature because an AbortSignal does not survive `JSON.stringify` and is not part of
 * the question's identity.
 */
export function useKbAsk() {
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "ask"],
    mutationFn: ({ signal, ...input }: KbAskInput & AiAbortInput) =>
      apiClient.post<KbAskResponse>("/kb/ask", input, operation.configFor(input, { signal })),
    onSuccess: () => {
      operation.settle();
    },
  });
}

export function useKbAiAnswerFeedback() {
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "ai-feedback"],
    mutationFn: (input: KbAiFeedbackInput) =>
      apiClient.post<{ success: boolean }>("/kb/ai/feedback", input),
  });
}
