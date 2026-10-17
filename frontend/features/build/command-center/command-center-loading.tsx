"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PmPageShell, PM_PANEL } from "@/components/pm-chrome";
import { COMMAND_CENTER_PAGE_SHELL } from "./command-center-constants";

export function CommandCenterLoading() {
  return (
    <PmPageShell className={COMMAND_CENTER_PAGE_SHELL}>
      <div className="flex min-w-0 w-full max-w-full flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <div className={cn("flex flex-wrap gap-2 rounded-xl p-2.5", PM_PANEL)}>
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      <div className="min-w-0 w-full max-w-full">
        <StatCardGridSkeleton cols={3} />
      </div>
      <Skeleton className={cn("h-40 rounded-xl", PM_PANEL)} />
      <Skeleton className={cn("h-36 rounded-xl", PM_PANEL)} />
      <div className="grid min-w-0 w-full max-w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton key={index} className={cn("h-28 rounded-xl", PM_PANEL)} />
        ))}
      </div>
    </PmPageShell>
  );
}
