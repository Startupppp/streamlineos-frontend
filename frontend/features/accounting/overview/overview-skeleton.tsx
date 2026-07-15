"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <StatCardGridSkeleton cols={4} count={12} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-4 w-48 mb-4" />
          <Skeleton className="h-[240px] w-full" />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="space-y-2.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-md" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-[68px] w-full rounded-xl" />
            <Skeleton className="h-[68px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
