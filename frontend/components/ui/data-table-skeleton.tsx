"use client";

import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { PAUSED_LABEL, PAUSED_MESSAGE } from "@/components/shared/loading-state";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * TanStack pauses a query while the browser is offline: it neither resolves nor rejects, so
 * an offline read renders this skeleton for ever. Reading the connection here means every
 * caller that returns `<DataTableSkeleton />` from its loading branch says "paused" instead
 * of "loading" without a single call site changing — the same three lines `LoadingState` and
 * `DataTable`'s inline skeleton already carry.
 */
type DataTableSkeletonProps = {
  rows?: number;
  className?: string;
  mobileCards?: boolean;
} & ({ headers: readonly string[]; columns?: never } | { headers?: never; columns?: number });

export function DataTableSkeleton({
  rows = 12,
  className,
  mobileCards = false,
  ...shape
}: DataTableSkeletonProps) {
  const isOnline = useOnlineStatus();
  const headers = shape.headers ?? null;
  const columns = headers ? headers.length : (shape.columns ?? 4);

  return (
    <div
      className={cn("rounded-md border border-border bg-card overflow-hidden", className)}
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
      {mobileCards ? (
        <div className="flex flex-col gap-2 p-2 sm:hidden">
          {Array.from({ length: 6 }).map((_, cardIdx) => (
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
      <Table containerClassName={mobileCards ? "hidden sm:block" : undefined}>
        <TableHeader className="bg-muted/50 border-b border-border">
          <TableRow className="hover:bg-transparent">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <TableHead key={colIdx} className="px-2 py-2">
                {headers ? (
                  headers[colIdx]
                ) : (
                  <>
                    <Skeleton className="h-3.5 w-16" aria-hidden="true" />
                    <span className="sr-only">Column {colIdx + 1}</span>
                  </>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <TableRow key={rowIdx} className="h-10 hover:bg-transparent">
              {Array.from({ length: columns }).map((_, colIdx) => (
                <TableCell key={colIdx} className="px-2 py-2">
                  <Skeleton className={cn("h-3.5", colIdx === 0 ? "w-3/4" : "w-1/2")} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
