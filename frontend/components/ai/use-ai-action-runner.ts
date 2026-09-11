"use client";

import * as React from "react";
import type { AiActionResultState } from "./ai-action-result-body";
import { classifyAiError } from "./ai-error-state";
import {
  type AiAction,
  type AiResultSurface,
  resolveSurface,
  buildInlineSession,
} from "./ai-action-types";

interface UseAiActionRunnerParams {
  defaultSurface?: AiResultSurface;
}

export function useAiActionRunner({ defaultSurface }: UseAiActionRunnerParams) {
  const [active, setActive] = React.useState<AiAction | null>(null);
  const [state, setState] = React.useState<AiActionResultState>({ status: "loading" });
  const [overlayOpen, setOverlayOpen] = React.useState(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const activeRef = React.useRef<AiAction | null>(null);
  const stateRef = React.useRef<AiActionResultState>({ status: "loading" });
  const inlineActionRef = React.useRef<AiAction | null>(null);
  const runSeqRef = React.useRef(0);
  const inFlightRef = React.useRef(false);
  const controllerRef = React.useRef<AbortController | null>(null);
  const attemptRef = React.useRef(1);
  const streamedRef = React.useRef("");

  React.useEffect(() => {
    activeRef.current = active;
  }, [active]);

  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const discardInFlight = React.useCallback(() => {
    if (!inFlightRef.current) return false;
    runSeqRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    inFlightRef.current = false;
    return true;
  }, []);

  const pushInlineSession = React.useCallback(
    (action: AiAction, nextState: AiActionResultState) => {
      if (!action.onInlineChange) return;

      const handlers = {
        apply: () => {
          const currentAction = activeRef.current;
          const currentState = stateRef.current;
          if (currentAction?.onApply && currentState.status === "ready") {
            currentAction.onApply(currentState.result.text);
          }
          action.onInlineChange?.(null);
          inlineActionRef.current = null;
        },
        reject: () => {
          discardInFlight();
          action.onInlineChange?.(null);
          inlineActionRef.current = null;
        },
        retry: () => {
          void runActionRef.current(action, true);
        },
        cancel: () => {
          cancelRunRef.current();
        },
      };

      action.onInlineChange(buildInlineSession(action, nextState, handlers));
    },
    [discardInFlight],
  );

  const runActionRef = React.useRef<
    (action: AiAction, isRetry?: boolean) => Promise<void>
  >(async () => {});
  const cancelRunRef = React.useRef<() => void>(() => {});

  const runAction = React.useCallback(
    async (action: AiAction, isRetry = false) => {
      if (inFlightRef.current) return;

      const surface = resolveSurface(action, defaultSurface);

      if (surface === "inline" && !action.onInlineChange) return;

      const stamp = ++runSeqRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      inFlightRef.current = true;
      attemptRef.current = isRetry ? attemptRef.current + 1 : 1;
      streamedRef.current = "";

      const loadingState: AiActionResultState = {
        status: "loading",
        attempt: attemptRef.current,
      };

      setActive(action);
      setState(loadingState);
      if (surface === "inline") {
        inlineActionRef.current = action;
        pushInlineSession(action, loadingState);
      } else if (surface === "popover") {
        setPopoverOpen(true);
      } else {
        setOverlayOpen(true);
      }

      function handleToken(chunk: string) {
        if (runSeqRef.current !== stamp) return;
        streamedRef.current += chunk;
        const streamingState: AiActionResultState = {
          status: "streaming",
          text: streamedRef.current,
        };
        setState(streamingState);
        if (surface === "inline") pushInlineSession(action, streamingState);
      }

      let nextState: AiActionResultState;
      try {
        const result = await action.run(controller.signal, handleToken);
        nextState = { status: "ready", result, aiUsage: result.aiUsage };
      } catch (error) {
        nextState = classifyAiError(error);
      }

      if (runSeqRef.current !== stamp) return;
      inFlightRef.current = false;
      controllerRef.current = null;
      setState(nextState);
      if (surface === "inline") pushInlineSession(action, nextState);
    },
    [defaultSurface, pushInlineSession],
  );

  runActionRef.current = runAction;

  const cancelRun = React.useCallback(() => {
    if (!discardInFlight()) return;
    const cancelledState: AiActionResultState = {
      status: "cancelled",
      text: streamedRef.current || undefined,
    };
    setState(cancelledState);
    const action = inlineActionRef.current;
    if (action) pushInlineSession(action, cancelledState);
  }, [discardInFlight, pushInlineSession]);

  cancelRunRef.current = cancelRun;

  React.useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      inlineActionRef.current?.onInlineChange?.(null);
    };
  }, []);

  const handleRetry = React.useCallback(() => {
    if (active) void runAction(active, true);
  }, [active, runAction]);

  const handleApply = React.useCallback(() => {
    if (active?.onApply && state.status === "ready") {
      active.onApply(state.result.text);
    }
    setOverlayOpen(false);
    setPopoverOpen(false);
  }, [active, state]);

  const handleOverlayOpenChange = React.useCallback(
    (open: boolean) => {
      setOverlayOpen(open);
      if (!open) {
        discardInFlight();
        setActive(null);
        setState({ status: "loading" });
      }
    },
    [discardInFlight],
  );

  const handlePopoverOpenChange = React.useCallback(
    (open: boolean) => {
      setPopoverOpen(open);
      if (!open) {
        discardInFlight();
        setActive(null);
        setState({ status: "loading" });
      }
    },
    [discardInFlight],
  );

  return {
    active,
    state,
    overlayOpen,
    popoverOpen,
    runAction,
    cancelRun,
    handleRetry,
    handleApply,
    handleOverlayOpenChange,
    handlePopoverOpenChange,
  };
}
