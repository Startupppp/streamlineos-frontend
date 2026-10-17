"use client";

import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function PreviewSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-hidden px-4 pb-4 pt-3 scrollbar-hide lg:overflow-y-auto lg:px-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-2/3 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="h-3 w-1/3 rounded" />
        <Skeleton className="h-28 w-full rounded-lg" />
        <div className="border-t border-border pt-4">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="mt-3 h-20 w-full rounded-lg" />
        </div>
      </div>
      <div className="hidden shrink-0 border-t border-border px-4 py-3 lg:block lg:w-72 lg:min-w-72 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:scrollbar-hide xl:w-80 xl:min-w-80">
        <div className="mb-4 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="mt-2 h-9 w-full rounded-md" />
        <Skeleton className="mt-5 h-4 w-16 rounded" />
        <Skeleton className="mt-2 h-9 w-full rounded-md" />
        <Skeleton className="mt-5 h-4 w-20 rounded" />
        <Skeleton className="mt-2 h-9 w-full rounded-md" />
      </div>
    </div>
  );
}

export function PreviewError({
  title,
  description,
  onClose,
  onRetry,
}: {
  title: string;
  description: string;
  onClose?: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {onClose ? (
        <div className="flex shrink-0 px-2 pt-2 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Back to inbox"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mb-1 font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onRetry}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}
