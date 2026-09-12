"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * A saved report whose conditions the builder cannot draw.
 *
 * It is still runnable, and saying so matters more than hiding it: the report
 * exists, somebody depends on it, and refusing to show the controls is not the
 * same as refusing to show the numbers.
 */
export function UnshowableReport({
  reason,
  isRunning,
  onRun,
}: {
  reason: string;
  isRunning: boolean;
  onRun: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{reason}</p>
      <Button onClick={onRun} disabled={isRunning}>
        {isRunning ? "Running…" : "Run it as saved"}
      </Button>
    </div>
  );
}

export function ReportBuilderFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
  );
}
