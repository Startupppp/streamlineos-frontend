"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { isChunkLoadError, reportError } from "@/lib/observability";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AttendanceError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    const route = typeof window !== "undefined" ? window.location.pathname : undefined;
    const extra: Record<string, unknown> = { route, digest: error.digest };
    if (isChunkLoadError(error)) extra.recoverable = true;
    reportError(error, extra);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">Failed to load Attendance</h2>
      <p className="text-muted-foreground text-center max-w-md">
        {getErrorMessage(error)}
      </p>
      <Button onClick={reset} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
