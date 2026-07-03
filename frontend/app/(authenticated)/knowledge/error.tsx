"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function KnowledgeBaseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;
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
