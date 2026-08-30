"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { isChunkLoadError, reportError } from "@/lib/observability";

export default function KnowledgeBaseError({
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

  return (
    <div className="flex h-full items-center justify-center p-8">
      <ErrorState
        title="Something went wrong"
        description="Failed to load the wiki. Please try again."
        onRetry={reset}
      />
    </div>
  );
}
