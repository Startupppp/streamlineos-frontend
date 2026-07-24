"use client";

import { useCallback, useRef, useState } from "react";
import type { AiActionResult, AiActionResultState } from "./ai-action-result-body";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";

interface UseAiPopoverActionOptions {
  run: () => Promise<AiActionResult>;
}

export function useAiPopoverAction({ run }: UseAiPopoverActionOptions) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AiActionResultState>({ status: "loading" });
  const [isPending, setIsPending] = useState(false);
  const runRef = useRef(run);

  runRef.current = run;

  const execute = useCallback(async () => {
    setOpen(true);
    setState({ status: "loading" });
    setIsPending(true);

    try {
      const result = await runRef.current();
      setState({ status: "ready", result, aiUsage: result.aiUsage });
    } catch (error) {
      if (isApiError(error) && error.status === 402) {
        setState({ status: "quota" });
      } else if (isApiError(error) && error.status === 403) {
        setState({ status: "denied", reason: getErrorMessage(error) });
      } else {
        setState({ status: "error", message: getErrorMessage(error) });
      }
    } finally {
      setIsPending(false);
    }
  }, []);

  const retry = useCallback(() => {
    void execute();
  }, [execute]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setState({ status: "loading" });
    }
  }, []);

  return {
    open,
    state,
    isPending,
    execute,
    retry,
    handleOpenChange,
  };
}
