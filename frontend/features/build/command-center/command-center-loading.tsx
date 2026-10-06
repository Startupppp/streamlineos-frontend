"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PmPageShell, PM_PANEL } from "@/components/pm-chrome";
import { COMMAND_CENTER_PAGE_SHELL } from "./command-center-constants";

export function CommandCenterLoading() {
  return (
    <PmPageShell className={COMMAND_CENTER_PAGE_SHELL}>
      <div className="min-w-0 w-full max-w-full">
        <StatCardGridSkeleton cols={3} />
      </div>
      <Skeleton className={cn("h-56 rounded-xl", PM_PANEL)} />
      <Skeleton className={cn("h-48 rounded-xl", PM_PANEL)} />
      <div className="grid min-w-0 w-full max-w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton key={index} className={cn("h-28 rounded-xl", PM_PANEL)} />
        ))}
      </div>
    </PmPageShell>
  );
}
