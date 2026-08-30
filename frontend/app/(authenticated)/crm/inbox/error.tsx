"use client";

import { useEffect } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared";
import { isChunkLoadError, reportError } from "@/lib/observability";

interface InboxErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function InboxError({ error, reset }: InboxErrorProps) {
  useEffect(() => {
    const route = typeof window !== "undefined" ? window.location.pathname : undefined;
    const extra: Record<string, unknown> = { route, digest: error.digest };
    if (isChunkLoadError(error)) extra.recoverable = true;
    reportError(error, extra);
  }, [error]);

  return (
    <PageWrapper title="Sales Inbox" subtitle="Your daily command center">
      <ErrorState
        title="Failed to load inbox"
        description="Something went wrong loading your inbox."
        onRetry={reset}
        className="flex-1 min-h-[300px]"
      />
    </PageWrapper>
  );
}
