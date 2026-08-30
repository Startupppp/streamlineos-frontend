"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/shared/error-state";
import { isChunkLoadError, reportError } from "@/lib/observability";

export default function BuilderError({
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

  const router = useRouter();

  function handleRetry() {
    reset();
    router.back();
  }

  return <ErrorState title="Failed to load builder" onRetry={handleRetry} className="flex-1 h-full" />;
}
