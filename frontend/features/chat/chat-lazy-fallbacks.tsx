"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ChatPanelFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="flex h-full w-full flex-1 flex-col gap-3 border-l border-border/40 bg-card/50 p-4"
    >
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function ChatOverlayFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4"
    >
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-panel">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-24 self-end" />
      </div>
    </div>
  );
}

export function ChatPopoverFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="flex w-64 flex-col gap-2 rounded-lg border border-border bg-popover p-3 shadow-panel"
    >
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export function ChatTriggerFallback({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="shrink-0">
      <Skeleton className="h-8 w-14 rounded-lg" />
    </div>
  );
}

export function ChatInlineFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="mt-1.5 flex flex-col gap-1.5 rounded-lg border border-border/40 bg-muted/30 p-2"
    >
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
