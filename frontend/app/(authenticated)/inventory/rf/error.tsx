"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared";
import { RfShell } from "@/features/inventory/components/rf/rf-shell";
import { isChunkLoadError, reportError } from "@/lib/observability";

export default function RfError({
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
    <RfShell title="Task screen failed">
      <ErrorState
        title="This screen could not be displayed"
        description="Nothing you confirmed has been lost — anything captured offline is still queued on this device. Try again."
        onRetry={reset}
        className="flex-1"
      />
    </RfShell>
  );
}
