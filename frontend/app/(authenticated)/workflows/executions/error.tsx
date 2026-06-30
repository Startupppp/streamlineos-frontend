"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function ExecutionsError({ reset }: { reset: () => void }) {
  return <ErrorState title="Failed to load executions" onRetry={reset} className="flex-1" />;
}
