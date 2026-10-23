"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type WidgetSkeletonVariant = "list" | "activity" | "pulse";

interface WidgetSkeletonProps {
  rows?: number;
  variant?: WidgetSkeletonVariant;
  className?: string;
}

function ListRowSkeleton({
  withAvatar = false,
  showMeta = true,
}: {
  withAvatar?: boolean;
  showMeta?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/60 px-2 py-2 sm:gap-3">
      {withAvatar ? (
        <Skeleton className="h-7 w-7 shrink-0 rounded-full sm:h-8 sm:w-8" />
      ) : (
        <Skeleton className="h-4 w-4 shrink-0 rounded" />
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-[75%] max-w-[12rem] sm:w-[70%]" />
        <Skeleton className="h-3 w-[50%] max-w-[8rem] sm:w-[45%]" />
      </div>
      {showMeta ? (
        <Skeleton className="hidden h-5 w-12 shrink-0 rounded-full sm:block" />
      ) : null}
    </div>
  );
}

function PulseSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="flex min-w-0 items-start gap-2 rounded-xl border border-border/80 bg-card px-2.5 py-2 sm:gap-2.5 sm:px-3 sm:py-2.5"
        >
          <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-lg sm:h-8 sm:w-8" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-12 sm:w-16" />
            <Skeleton className="h-3 w-14 sm:w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WidgetSkeleton({
  rows = 4,
  variant = "list",
  className,
}: WidgetSkeletonProps) {
  const mobileRows = Math.min(rows, 3);

  return (
    <Card
      className={cn("flex h-full min-h-0 min-w-0 flex-col", className)}
      aria-hidden="true"
    >
      <CardHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 px-3 pb-2 pt-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="h-4 w-4 shrink-0 rounded" />
          <Skeleton className="h-4 w-24 sm:w-28" />
        </div>
        <Skeleton className="hidden h-3 w-14 shrink-0 sm:block" />
      </CardHeader>
      <CardContent
        className={cn(
          "min-h-0 min-w-0 flex-1 px-3 pb-3 pt-0 sm:px-4 sm:pb-4",
          variant === "pulse" ? "flex-none py-3" : "space-y-2",
        )}
      >
        {variant === "pulse" ? (
          <PulseSkeleton />
        ) : (
          <>
            {Array.from({ length: mobileRows }, (_, index) => (
              <ListRowSkeleton
                key={`m-${index}`}
                withAvatar={variant === "activity"}
              />
            ))}
            {rows > mobileRows
              ? Array.from({ length: rows - mobileRows }, (_, index) => (
                  <div key={`d-${index}`} className="hidden sm:block">
                    <ListRowSkeleton withAvatar={variant === "activity"} />
                  </div>
                ))
              : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
