"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PM_PANEL } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";

export function GoalsGridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn(PM_PANEL, "space-y-3 p-4")}>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
