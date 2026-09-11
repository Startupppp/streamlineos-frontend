"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell } from "@/components/pm-chrome";

export function SprintsPageSkeleton() {
  return (
    <PmPageShell>
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="border-t border-border/50" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </PmPageShell>
  );
}
