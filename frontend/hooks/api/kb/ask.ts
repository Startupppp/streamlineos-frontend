"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useEffect, useRef } from "react";
import { streamAiResult, type AiResultStreamOptions } from "@/hooks/api/ai-result-stream";
import { kbAskResultSchema } from "./ask-result-schema";
import type { KbAskInput, KbAskResponse, KbAiFeedbackInput } from "@/types/kb";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";

const kbAiFeedbackContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-ai-schema").then((m) => m.kbAiFeedbackContract),
);

// Stable question keys prevent duplicate paid dispatch; streaming retries do not replay a completed body.
export function useKbAsk() {
  const operation = useIdempotentOperation();
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  function stop() { controllerRef.current?.abort(); }
  function resetAttempt() { if (!controllerRef.current) operation.settle(); }
  const mutation = useAuthorizedMutation("kb:ai:generate", {
    mutationKey: ["kb", "ask"],
    mutationFn: async ({ signal, onToken, ...input }: KbAskInput & AiResultStreamOptions): Promise<KbAskResponse> => {
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
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "ai-feedback"],
    mutationFn: (input: KbAiFeedbackInput) =>
      apiClient.post<{ success: boolean }>("/kb/ai/feedback", input, undefined, kbAiFeedbackContract),
  });
}
