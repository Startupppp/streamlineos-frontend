"use client";

import { AiActionResultBody } from "./ai-action-result-body";
import { classifyAiError, isRetryableAiFailure } from "./ai-error-state";

interface AiFailureBodyProps {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}

/**
 * The failure branch for an AI surface that owns its own success rendering.
 * Without it a card falls back to one red sentence plus Retry, which sells a
 * plan gate as exhausted credits and offers a retry that cannot help.
 */
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
