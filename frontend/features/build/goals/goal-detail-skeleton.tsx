"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PM_PANEL } from "@/components/pm-chrome/pm-chrome";
import { cn } from "@/lib/utils";

export function GoalDetailSkeleton() {
  return (
    <PmPageShell>
      <div className={cn(PM_PANEL, "space-y-3 p-4")}>
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl border border-border bg-card" />
        ))}
      </div>
    </PmPageShell>
  );
}
