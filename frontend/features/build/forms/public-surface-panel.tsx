"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicFailure } from "@/features/build/forms/public-surface-states";

interface PublicSurfacePanelProps {
  failure: PublicFailure;
  onRetry?: () => void;
}

export function PublicSurfacePanel({
  failure,
  onRetry,
}: PublicSurfacePanelProps) {
  return (
    <div className="text-center py-8 space-y-3" role="alert">
      <div className="w-16 h-16 rounded-full bg-status-danger-surface mx-auto flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-status-danger-ink" />
      </div>
      <p className="text-lg font-medium text-foreground">{failure.title}</p>
      <p className="text-sm text-muted-foreground">{failure.description}</p>
      {failure.retryable && onRetry !== undefined && (
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
