"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiActionResult, AiActionResultState } from "./ai-action-result-body";
import type { AiInlineSession } from "./ai-inline-preview";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";

function toInlineStatus(state: AiActionResultState): AiInlineSession["status"] {
  if (state.status === "loading") return "loading";
  if (state.status === "ready") return "ready";
  if (state.status === "quota") return "quota";
  if (state.status === "denied") return "denied";
  return "error";
}

function buildInlineSession(
  actionKey: string,
  state: AiActionResultState,
  handlers: {
    apply: () => void;
    reject: () => void;
    retry: () => void;
  },
): AiInlineSession {
  return {
    actionKey,
    status: toInlineStatus(state),
    result: state.status === "ready" ? state.result : undefined,
    errorMessage: state.status === "error" ? state.message : undefined,
    deniedReason: state.status === "denied" ? state.reason : undefined,
    apply: handlers.apply,
    reject: handlers.reject,
    retry: handlers.retry,
  };
}

interface UseAiInlineActionOptions {
  actionKey: string;
  run: () => Promise<AiActionResult>;
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

  runRef.current = run;
  onApplyRef.current = onApply;
  onSessionChangeRef.current = onSessionChange;

  const pushSession = useCallback(
    (state: AiActionResultState) => {
      const handlers = {
        apply: () => {
          const result = readyResultRef.current;
          if (result) {
            onApplyRef.current(result.text);
          }
          readyResultRef.current = null;
          onSessionChangeRef.current(null);
        },
        reject: () => {
          readyResultRef.current = null;
          onSessionChangeRef.current(null);
        },
        retry: () => {
          void executeRef.current();
        },
      };
      onSessionChangeRef.current(buildInlineSession(actionKey, state, handlers));
    },
    [actionKey],
  );

  const executeRef = useRef<() => Promise<void>>(async () => {});

  const execute = useCallback(async () => {
    setIsPending(true);
    readyResultRef.current = null;
    pushSession({ status: "loading" });

    try {
      const result = await runRef.current();
      readyResultRef.current = result;
      pushSession({ status: "ready", result, aiUsage: result.aiUsage });
    } catch (error) {
      let nextState: AiActionResultState;
      if (isApiError(error) && error.status === 402) {
        nextState = { status: "quota" };
      } else if (isApiError(error) && error.status === 403) {
        nextState = { status: "denied", reason: getErrorMessage(error) };
      } else {
        nextState = { status: "error", message: getErrorMessage(error) };
      }
      pushSession(nextState);
    } finally {
      setIsPending(false);
    }
  }, [pushSession]);

  executeRef.current = execute;

  useEffect(() => {
    return () => {
      onSessionChangeRef.current(null);
    };
  }, []);

  return { run: execute, isPending };
}
