"use client";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";

export default function CrmDataQualityError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      <Button variant="outline" size="sm" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
