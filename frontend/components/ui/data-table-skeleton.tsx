"use client";

import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PAUSED_LABEL,
  PAUSED_MESSAGE,
} from "@/components/shared/loading-state";
import { StalledReadNotice } from "@/components/shared/stalled-read-notice";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import {
  PANEL_STALLED_AFTER_MS,
  useStalledAfter,
} from "@/hooks/common/use-stalled-after";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const DATA_TABLE_SKELETON_FILL_ROWS = 20;

type DataTableSkeletonProps = {
  rows?: number;
  className?: string;
  mobileCards?: boolean;
  onStalledRetry?: () => void;
  fill?: boolean;
} & (
  | { headers: readonly string[]; columns?: never }
  | { headers?: never; columns?: number }
);

export function DataTableSkeleton({
  rows,
  className,
  mobileCards = false,
  onStalledRetry,
  fill = false,
  ...shape
}: DataTableSkeletonProps) {
  const isOnline = useOnlineStatus();
  const stalled = useStalledAfter(
    isOnline && !!onStalledRetry,
    PANEL_STALLED_AFTER_MS,
  );
  const headers = shape.headers ?? null;
  const columns = headers ? headers.length : (shape.columns ?? 4);
  const rowCount = rows ?? (fill ? DATA_TABLE_SKELETON_FILL_ROWS : 12);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-card",
        fill && "flex min-h-0 flex-1 flex-col",
        className,
      )}
      aria-busy={isOnline}
    >
      <span role="status" className="sr-only">
        {isOnline ? "Loading results…" : PAUSED_LABEL}
      </span>
      {!isOnline && (
        <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          {PAUSED_MESSAGE}
        </p>
      )}
      {stalled && onStalledRetry ? (
        <StalledReadNotice
          subject="results"
          onRetry={onStalledRetry}
          className="m-2"
        />
      ) : null}
      {mobileCards ? (
        <div className="flex flex-col gap-2 p-2 sm:hidden">
          {Array.from({ length: fill ? 10 : 6 }).map((_, cardIdx) => (
            <div
              key={cardIdx}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
            >
              <Skeleton className="h-3.5 w-3/4" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="ml-auto h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className={cn(fill && "min-h-0 flex-1 overflow-hidden")}>
        <Table
          containerClassName={mobileCards ? "hidden sm:block" : undefined}
          containerFocusable={headers !== null}
          aria-hidden={headers ? undefined : true}
        >
          <TableHeader className="bg-muted/50 border-b border-border">
            <TableRow className="hover:bg-transparent">
              {Array.from({ length: columns }).map((_, colIdx) => (
                <TableHead key={colIdx} className="px-2 py-2">
                  {headers ? (
                    headers[colIdx]
                  ) : (
                    <Skeleton className="h-3.5 w-16" />
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIdx) => (
              <TableRow key={rowIdx} className="h-10 hover:bg-transparent">
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <TableCell key={colIdx} className="px-2 py-2">
                    <Skeleton
                      className={cn("h-3.5", colIdx === 0 ? "w-3/4" : "w-1/2")}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
