"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiActionResult, AiActionResultState } from "./ai-action-result-body";
import type { AiInlineSession } from "./ai-inline-preview";
import { classifyAiError } from "./ai-error-state";

interface UseAiInlineActionOptions {
  actionKey: string;
  run: (signal?: AbortSignal) => Promise<AiActionResult>;
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

  const executeRef = useRef<() => Promise<void>>(async () => {});
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
          void executeRef.current();
        },
        cancel: () => {
          cancelRef.current();
        },
      };
      onSessionChangeRef.current(session);
    },
    [actionKey, discardInFlight],
  );

  const execute = useCallback(async () => {
    if (inFlightRef.current) return;

    const stamp = ++runSeqRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    inFlightRef.current = true;
    setIsPending(true);
    readyResultRef.current = null;
    pushSession({ status: "loading" });

    let nextState: AiActionResultState;
    try {
      const result = await runRef.current(controller.signal);
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
    pushSession({ status: "cancelled" });
  }, [discardInFlight, pushSession]);

  cancelRef.current = cancel;

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      onSessionChangeRef.current(null);
    };
  }, []);

  return { run: execute, cancel, isPending };
}
