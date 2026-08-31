"use client";

import { useCallback } from "react";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useUserAuditLog } from "@/hooks/api/users";
import { getErrorMessage } from "@/lib/get-error-message";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface UserAuditTabProps {
  userId: string;
}

function friendlyAction(action: string): string {
  return action
    .replace(/^user\./, "")
    .replace(/\./g, " ")
    .replace(/_/g, " ");
}

export function UserAuditTab({ userId }: UserAuditTabProps) {
  // The audit log is append-only and written to while it is read, so it walks a
  // cursor: there is no page count because the server is never asked to count it.
  const { cursor, pageNumber, hasPrevious, goNext, goPrevious } = useCursorPagination();
  const { data, isLoading, error, refetch } = useUserAuditLog(userId, {
    ...(cursor !== undefined ? { cursor } : {}),
    limit: 15,
  });

  const entries = data?.data ?? [];
  const pagination = data?.pagination;

  const handlePageNext = useCallback(() => {
    goNext(pagination?.nextCursor ?? null);
  }, [goNext, pagination?.nextCursor]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        className="min-h-full w-full flex-1 border-0 bg-transparent"
        illustrationPreset="alert"
        illustrationSize="md"
        title="Couldn't load audit log"
        description={getErrorMessage(error)}
        action={{ label: "Retry", onClick: handleRetry }}
      />
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        className="min-h-full w-full flex-1 border-0 bg-transparent"
        illustrationPreset="security"
        illustrationSize="md"
        title="No audit events"
        description="No activity has been logged for this user yet."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3">
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-md border px-3 py-2 text-xs"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium capitalize">{friendlyAction(entry.action)}</p>
              {entry.actorUserId && entry.actorUserId !== userId && (
                <p className="text-muted-foreground mt-0.5 truncate">
                  by an admin
                </p>
              )}
            </div>
            <span className="text-muted-foreground shrink-0 mt-0.5">
              {format(new Date(entry.createdAt), "MMM d, HH:mm")}
            </span>
          </div>
        ))}
      </div>

      {pagination && (hasPrevious || pagination.hasMore) && (
        <div className="flex shrink-0 items-center justify-end text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={goPrevious}
              disabled={!hasPrevious}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-1 tabular-nums">Page {pageNumber}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handlePageNext}
              disabled={!pagination.hasMore}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
