"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayrollImportExportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="Import / Export error"
      fallbackMessage="Failed to load import / export. Please try again."
    />
  );
}
