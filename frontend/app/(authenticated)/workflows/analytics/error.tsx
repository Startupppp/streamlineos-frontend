"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function AnalyticsError({ reset }: { reset: () => void }) {
  return <ErrorState title="Failed to load analytics" onRetry={reset} className="flex-1" />;
}
