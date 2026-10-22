"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { isChunkLoadError, reportError } from "@/lib/observability";

export default function KnowledgeWikiPageError({
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
    <div className="flex flex-1 min-h-0 items-center justify-center p-8">
      <ErrorState
        title="Something went wrong"
        description="Failed to load this page. Please try again."
        onRetry={reset}
      />
    </div>
  );
}
