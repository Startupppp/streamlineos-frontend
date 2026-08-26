"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import { isChunkLoadError, reportError } from "@/lib/observability";

export default function CrmDataQualityError({
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
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      <Button variant="outline" size="sm" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
