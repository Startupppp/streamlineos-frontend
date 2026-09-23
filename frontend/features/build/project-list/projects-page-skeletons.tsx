"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PmPanel, PM_PANEL } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn(PM_PANEL, "border-l-[3px] border-l-muted p-2 space-y-2")}
        >
          <div className="flex gap-2">
            <Skeleton className="h-7 w-7 rounded-md shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-10 rounded" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
          <Skeleton className="h-1 w-full rounded-full" />
          <div className="flex justify-between border-t border-border/60 pt-1.5">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton() {
  return (
    <PmPanel className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-4 border-b border-border/60 bg-muted/20 px-3 py-1.5">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="ml-auto hidden h-3 w-12 sm:block" />
        <Skeleton className="hidden h-3 w-10 md:block" />
        <Skeleton className="hidden h-3 w-12 lg:block" />
        <Skeleton className="hidden h-3 w-14 sm:block" />
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 border-b border-border/40 px-3 py-1.5 last:border-0"
        >
          <Skeleton className="h-5 w-5 shrink-0 rounded" />
          <Skeleton className="h-3.5 max-w-[220px] flex-1" />
          <Skeleton className="ml-auto h-5 w-14 shrink-0 rounded-full" />
          <div className="hidden shrink-0 items-center gap-1.5 md:flex">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-3 w-14" />
          </div>
          <Skeleton className="hidden h-3 w-12 shrink-0 lg:block" />
          <div className="hidden w-[100px] shrink-0 items-center gap-2 sm:flex">
            <Skeleton className="h-1 flex-1 rounded-full" />
            <Skeleton className="h-3 w-6" />
          </div>
        </div>
      ))}
    </PmPanel>
  );
}
