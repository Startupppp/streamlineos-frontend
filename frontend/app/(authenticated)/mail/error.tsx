"use client";

import { useCallback, useEffect } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { isChunkLoadError, reportError } from "@/lib/observability";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    const route = typeof window !== "undefined" ? window.location.pathname : undefined;
    const extra: Record<string, unknown> = { route, digest: error.digest };
    if (isChunkLoadError(error)) extra.recoverable = true;
    reportError(error, extra);
  }, [error]);

  const handleReset = useCallback(() => reset(), [reset]);

  return (
    <div className="flex flex-1 h-full items-center justify-center">
      <EmptyState
        illustrationPreset="alert"
        title="Something went wrong"
        description={error.message ?? "An unexpected error occurred in the Mail module."}
        action={{ label: "Try again", onClick: handleReset }}
      />
    </div>
  );
}
