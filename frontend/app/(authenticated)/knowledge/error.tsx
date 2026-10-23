"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { isChunkLoadError, reportError } from "@/lib/observability";

export default function KnowledgeBaseError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    const route = typeof window !== "undefined" ? window.location.pathname : undefined;
    const extra: Record<string, unknown> = { route, digest: error.digest };
    if (isChunkLoadError(error)) extra.recoverable = true;
    reportError(error, extra);
  }, [error]);

  return (
    <div className="flex h-full min-h-full w-full flex-1 flex-col">
      <ErrorState
        title="Something went wrong"
        description="Failed to load the wiki. Please try again."
        onRetry={retry}
      />
    </div>
  );
}
