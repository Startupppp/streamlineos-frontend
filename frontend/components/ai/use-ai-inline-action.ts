"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiActionResult, AiActionResultState } from "./ai-action-result-body";
import type { AiInlineSession } from "./ai-inline-preview";
import { classifyAiError } from "./ai-error-state";

interface UseAiInlineActionOptions {
  actionKey: string;
  run: (
    signal?: AbortSignal,
    onToken?: (chunk: string) => void,
  ) => Promise<AiActionResult>;
  onApply: (text: string) => void;
  onSessionChange: (session: AiInlineSession | null) => void;
}

export function useAiInlineAction({
  actionKey,
  run,
  onApply,
  onSessionChange,
}: UseAiInlineActionOptions) {
  const [isPending, setIsPending] = useState(false);
  const runRef = useRef(run);
  const onApplyRef = useRef(onApply);
  const onSessionChangeRef = useRef(onSessionChange);
  const readyResultRef = useRef<AiActionResult | null>(null);
  const runSeqRef = useRef(0);
  const inFlightRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const attemptRef = useRef(1);
  const streamedRef = useRef("");

  runRef.current = run;
  onApplyRef.current = onApply;
  onSessionChangeRef.current = onSessionChange;

  const discardInFlight = useCallback(() => {
    if (!inFlightRef.current) return false;
    runSeqRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    inFlightRef.current = false;
    setIsPending(false);
    return true;
  }, []);

  const executeRef = useRef<(isRetry?: boolean) => Promise<void>>(
    async () => {},
  );
  const cancelRef = useRef<() => void>(() => {});

  const pushSession = useCallback(
    (state: AiActionResultState) => {
      const session: AiInlineSession = {
        actionKey,
        state,
        apply: () => {
          const result = readyResultRef.current;
          if (result) onApplyRef.current(result.text);
          readyResultRef.current = null;
          onSessionChangeRef.current(null);
        },
        reject: () => {
          discardInFlight();
          readyResultRef.current = null;
          onSessionChangeRef.current(null);
        },
        retry: () => {
          void executeRef.current(true);
        },
        cancel: () => {
          cancelRef.current();
        },
      };
      onSessionChangeRef.current(session);
    },
    [actionKey, discardInFlight],
  );

  const execute = useCallback(async (isRetry = false) => {
    if (inFlightRef.current) return;

    const stamp = ++runSeqRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    inFlightRef.current = true;
    attemptRef.current = isRetry ? attemptRef.current + 1 : 1;
    streamedRef.current = "";
    setIsPending(true);
    readyResultRef.current = null;
    pushSession({ status: "loading", attempt: attemptRef.current });

    function handleToken(chunk: string) {
      if (runSeqRef.current !== stamp) return;
      streamedRef.current += chunk;
      pushSession({ status: "streaming", text: streamedRef.current });
    }

    let nextState: AiActionResultState;
    try {
      const result = await runRef.current(controller.signal, handleToken);
      nextState = { status: "ready", result, aiUsage: result.aiUsage };
      if (runSeqRef.current === stamp) readyResultRef.current = result;
    } catch (error) {
      nextState = classifyAiError(error);
    }

    if (runSeqRef.current !== stamp) return;
    inFlightRef.current = false;
    controllerRef.current = null;
    setIsPending(false);
    pushSession(nextState);
  }, [pushSession]);

  executeRef.current = execute;

  const cancel = useCallback(() => {
    if (!discardInFlight()) return;
    readyResultRef.current = null;
    pushSession({ status: "cancelled", text: streamedRef.current || undefined });
  }, [discardInFlight, pushSession]);

  cancelRef.current = cancel;

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      onSessionChangeRef.current(null);
    };
  }, []);

  const start = useCallback(() => execute(false), [execute]);

  return { run: start, cancel, isPending };
}
