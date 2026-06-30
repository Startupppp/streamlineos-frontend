"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function TemplatesError({ reset }: { reset: () => void }) {
  return <ErrorState title="Failed to load templates" onRetry={reset} className="flex-1" />;
}
