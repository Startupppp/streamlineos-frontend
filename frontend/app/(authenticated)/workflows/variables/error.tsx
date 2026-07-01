"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function VariablesError({ reset }: { reset: () => void }) {
  return <ErrorState title="Failed to load variables" onRetry={reset} className="flex-1" />;
}
