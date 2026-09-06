"use client";

import { useCallback, useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { getErrorMessage } from "@/lib/get-error-message";
import { isChunkLoadError, reportError } from "@/lib/observability";

export default function TerritoriesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const route = typeof window !== "undefined" ? window.location.pathname : undefined;
    const extra: Record<string, unknown> = { route, digest: error.digest };
    if (isChunkLoadError(error)) extra.recoverable = true;
    reportError(error, extra);
  }, [error]);

  const handleReset = useCallback(() => reset(), [reset]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <ErrorState
        title="Couldn't load territories"
        description={getErrorMessage(error)}
        onRetry={handleReset}
        className={CONTENT_FILL_PANEL}
      />
    </div>
  );
}
