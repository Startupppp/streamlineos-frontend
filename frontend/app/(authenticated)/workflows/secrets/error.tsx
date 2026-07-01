"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function SecretsError({ reset }: { reset: () => void }) {
  return <ErrorState title="Failed to load secrets" onRetry={reset} className="flex-1" />;
}
