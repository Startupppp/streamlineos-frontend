"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiActionResult, AiActionResultState } from "./ai-action-result-body";
import { classifyAiError } from "./ai-error-state";

interface UseAiPopoverActionOptions {
  run: (signal?: AbortSignal) => Promise<AiActionResult>;
}

export function useAiPopoverAction({ run }: UseAiPopoverActionOptions) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AiActionResultState>({ status: "loading" });
  const [isPending, setIsPending] = useState(false);
  const runRef = useRef(run);
  const runSeqRef = useRef(0);
  const inFlightRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

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

  const execute = useCallback(async () => {
    if (inFlightRef.current) return;

    const stamp = ++runSeqRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    inFlightRef.current = true;
    setOpen(true);
    setState({ status: "loading" });
    setIsPending(true);

    let nextState: AiActionResultState;
    try {
      const result = await runRef.current(controller.signal);
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

  const retry = useCallback(() => {
    void execute();
  }, [execute]);

  const cancel = useCallback(() => {
    if (!discardInFlight()) return;
    setState({ status: "cancelled" });
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
    execute,
    retry,
    cancel,
    handleOpenChange,
  };
}
