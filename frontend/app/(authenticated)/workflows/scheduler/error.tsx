"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function SchedulerError({ reset }: { reset: () => void }) {
  return <ErrorState title="Failed to load scheduler" onRetry={reset} className="flex-1" />;
}
