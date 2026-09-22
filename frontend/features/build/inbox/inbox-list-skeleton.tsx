"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function InboxListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 border-b border-border px-4 py-3">
          <Skeleton className="mt-0.5 h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-3/5 rounded" />
            <Skeleton className="mt-1.5 h-3 w-4/5 rounded" />
            <div className="mt-1.5 flex items-center gap-2">
              <Skeleton className="h-4 w-14 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
              <Skeleton className="ml-auto h-3 w-12 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
