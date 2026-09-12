"use client";

import { useCallback } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppLoadingStalledProps {
  className?: string;
  label: string;
}

export const STALLED_TITLE = "This is taking longer than it should";
export const STALLED_DESCRIPTION =
  "Your workspace has not finished syncing. The connection to the server may be down. Reloading usually clears it; if it does not, sign in again.";

export function AppLoadingStalled({ className, label }: AppLoadingStalledProps) {
  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div
      className={cn(
        "relative flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-6 text-center",
        className,
      )}
      role="alert"
      aria-live="assertive"
      aria-busy="false"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">{STALLED_TITLE}</h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          {STALLED_DESCRIPTION}
        </p>
      </div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <Button variant="outline" size="sm" onClick={handleReload}>
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
        Reload
      </Button>
    </div>
  );
}
