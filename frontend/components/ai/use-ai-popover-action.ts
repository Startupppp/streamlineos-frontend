"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiActionResult, AiActionResultState } from "./ai-action-result-body";
import { classifyAiError } from "./ai-error-state";

interface UseAiPopoverActionOptions {
  run: (
    signal?: AbortSignal,
    onToken?: (chunk: string) => void,
  ) => Promise<AiActionResult>;
}

export function useAiPopoverAction({ run }: UseAiPopoverActionOptions) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AiActionResultState>({ status: "loading" });
  const [isPending, setIsPending] = useState(false);
  const runRef = useRef(run);
  const runSeqRef = useRef(0);
  const inFlightRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const attemptRef = useRef(1);
  const streamedRef = useRef("");

  runRef.current = run;

  const discardInFlight = useCallback(() => {
    if (!inFlightRef.current) return false;
    runSeqRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    inFlightRef.current = false;
    setIsPending(false);
    return true;
  }, []);

  const execute = useCallback(async (isRetry = false) => {
    if (inFlightRef.current) return;

    const stamp = ++runSeqRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    inFlightRef.current = true;
    attemptRef.current = isRetry ? attemptRef.current + 1 : 1;
    streamedRef.current = "";
    setOpen(true);
    setState({ status: "loading", attempt: attemptRef.current });
    setIsPending(true);

    function handleToken(chunk: string) {
      if (runSeqRef.current !== stamp) return;
      streamedRef.current += chunk;
      setState({ status: "streaming", text: streamedRef.current });
    }

    let nextState: AiActionResultState;
    try {
      const result = await runRef.current(controller.signal, handleToken);
      nextState = { status: "ready", result, aiUsage: result.aiUsage };
    } catch (error) {
      nextState = classifyAiError(error);
    }

    if (runSeqRef.current !== stamp) return;
    inFlightRef.current = false;
    controllerRef.current = null;
    setIsPending(false);
    setState(nextState);
  }, []);

  const start = useCallback(() => execute(false), [execute]);

  const retry = useCallback(() => {
    void execute(true);
  }, [execute]);

  const cancel = useCallback(() => {
    if (!discardInFlight()) return;
    setState({ status: "cancelled", text: streamedRef.current || undefined });
  }, [discardInFlight]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        discardInFlight();
        setState({ status: "loading" });
      }
    },
    [discardInFlight],
  );

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return {
    open,
    state,
    isPending,
    execute: start,
    retry,
    cancel,
    handleOpenChange,
  };
}
