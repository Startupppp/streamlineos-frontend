"use client";

import { useEffect } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { PmPageShell } from "@/features/build/shared/pm-chrome";
import { isChunkLoadError, reportError } from "@/lib/observability";

export default function ManagedProductDetailError({
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
    <PageWrapper title="Managed Product" backHref="/build/managed-products">
      <PmPageShell>
        <ErrorState onRetry={reset} />
      </PmPageShell>
    </PageWrapper>
  );
}
