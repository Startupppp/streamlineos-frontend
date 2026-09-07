"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { useUserLoginHistory } from "@/hooks/api/users";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatClientDeviceLabel } from "@/lib/format-utils";
import { CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface UserLoginHistoryTabProps {
  userId: string;
}

export function UserLoginHistoryTab({ userId }: UserLoginHistoryTabProps) {
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const [successFilter, setSuccessFilter] = useState<boolean | undefined>(
    undefined,
  );

  const { data, isLoading, error, refetch } = useUserLoginHistory(userId, {
    cursor: cursors.at(-1),
    limit: 15,
    success: successFilter,
  });

  const entries = data?.data ?? [];
  const pagination = data?.pagination;
  const page = cursors.length;

  const handleFilterAll = useCallback(() => {
    setSuccessFilter(undefined);
    setCursors([undefined]);
  }, []);

  const handleFilterSuccess = useCallback(() => {
    setSuccessFilter(true);
    setCursors([undefined]);
  }, []);

  const handleFilterFailed = useCallback(() => {
    setSuccessFilter(false);
    setCursors([undefined]);
  }, []);

  const handlePagePrev = useCallback(() => {
    setCursors((current) => current.slice(0, -1));
  }, []);

  const handlePageNext = useCallback(() => {
    if (!pagination?.nextCursor) return;
    setCursors((current) => [...current, pagination.nextCursor ?? undefined]);
  }, [pagination?.nextCursor]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        compact
        className="flex-1 w-full min-h-0"
        illustrationPreset="alert"
        title="Couldn't load login history"
        description={getErrorMessage(error)}
        action={{ label: "Retry", onClick: handleRetry }}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3">
      <div className="shrink-0">
        <p className="text-label font-medium">Sign-in history</p>
        <p className="text-dense text-muted-foreground">
          Successful and failed authentication attempts for security review.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant={successFilter === undefined ? "secondary" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={handleFilterAll}
        >
          All
        </Button>
        <Button
          variant={successFilter === true ? "secondary" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={handleFilterSuccess}
        >
          <CheckCircle className="h-3 w-3 mr-1 text-status-success-ink" />
          Successful
        </Button>
        <Button
          variant={successFilter === false ? "secondary" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={handleFilterFailed}
        >
          <XCircle className="h-3 w-3 mr-1 text-status-danger-ink" />
          Failed
        </Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          compact
          className="flex-1 w-full min-h-0"
          illustrationPreset="security"
          title="No login history"
          description="No login events recorded for this user."
        />
      ) : (
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-md border px-3 py-2.5 text-xs"
            >
              <div className="mt-0.5">
                {entry.success ? (
                  <CheckCircle className="h-3.5 w-3.5 text-status-success-ink" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-status-danger-ink" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{entry.event}</span>
                  {entry.failureReason && (
                    <Badge
                      variant="destructive"
                      className="text-micro h-4 px-1"
                    >
                      {entry.failureReason}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-muted-foreground">
                  {entry.ipAddress && (
                    <span className="font-mono">{entry.ipAddress}</span>
                  )}
                  <span>{formatClientDeviceLabel(entry)}</span>
                  {(entry.city || entry.country) && (
                    <span>
                      {[entry.city, entry.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-muted-foreground shrink-0 mt-0.5">
                {format(new Date(entry.createdAt), "MMM d, HH:mm")}
              </span>
            </div>
          ))}
        </div>
      )}

      {pagination && (page > 1 || pagination.hasMore) && (
        <CursorPageControls
          page={page}
          hasNext={pagination.hasMore}
          onPrevious={handlePagePrev}
          onNext={handlePageNext}
        />
      )}
    </div>
  );
}
