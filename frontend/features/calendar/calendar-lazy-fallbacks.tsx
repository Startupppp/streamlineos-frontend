"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function CalendarOverlayFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4"
    >
      <div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-panel">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-9 w-24 self-end" />
      </div>
    </div>
  );
}

export function CalendarSheetFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col gap-3 border-l border-border bg-card p-5 shadow-panel"
    >
      <Skeleton className="h-6 w-3/5" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function CalendarListFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="flex min-h-0 flex-1 flex-col gap-2 p-4"
    >
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-5/6" />
      <Skeleton className="h-10 w-4/6" />
    </div>
  );
}
