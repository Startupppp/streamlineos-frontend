"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared";
import { RfShell } from "@/features/inventory/components/rf/rf-shell";
import { isChunkLoadError, reportError } from "@/lib/observability";

/**
 * NEO-5 — the handheld's own boundary.
 *
 * The module boundary one level up is a desktop page shell, and falling back to
 * it puts a `PageWrapper` in front of somebody holding a scanner in one hand.
 * So RF owns its recovery: the same `RfShell` chrome every RF screen renders,
 * one column, and exactly one action — retry — placed where a thumb already
 * expects it. `RfShell` also keeps the online/queued strip visible, which is the
 * fact an operator needs most when a screen has just failed: whatever they
 * already confirmed is still on the device.
 */
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
