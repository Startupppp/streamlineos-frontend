"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function DetailSkeleton() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
      <div className="min-h-0 min-w-0 flex-1 basis-0 space-y-4 overflow-y-auto bg-card px-4 pb-4 pt-2 scrollbar-hide md:px-6 md:pb-5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <div className="hidden min-h-0 shrink-0 overflow-y-auto border-t border-border px-4 py-3 scrollbar-hide md:block md:w-96 md:min-w-96 md:border-t-0 md:border-l md:pr-4 xl:w-[26rem] xl:min-w-[26rem]">
        <div className="mb-3 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="mb-3 h-9 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
