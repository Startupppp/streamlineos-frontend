"use client";

import { useCallback } from "react";
import { ErrorState } from "@/components/shared";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { getErrorMessage } from "@/lib/get-error-message";

export default function TerritoriesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const handleReset = useCallback(() => reset(), [reset]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <ErrorState
        title="Couldn't load territories"
        description={getErrorMessage(error)}
        onRetry={handleReset}
        className={CONTENT_FILL_PANEL}
      />
    </div>
  );
}
