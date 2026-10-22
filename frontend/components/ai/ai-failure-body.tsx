"use client";

import { AiActionResultBody } from "./ai-action-result-body";
import { classifyAiError, isRetryableAiFailure } from "./ai-error-state";

interface AiFailureBodyProps {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}

export function AiFailureBody({ error, onRetry, compact = true }: AiFailureBodyProps) {
  const state = classifyAiError(error);

  return (
    <AiActionResultBody
      state={state}
      onRetry={isRetryableAiFailure(state.status) ? onRetry : undefined}
      compact={compact}
    />
  );
}
