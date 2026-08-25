"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useUserLoginHistory } from "@/hooks/api/users";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatClientDeviceLabel } from "@/lib/format-utils";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface UserLoginHistoryTabProps {
  userId: string;
}

export function UserLoginHistoryTab({ userId }: UserLoginHistoryTabProps) {
  const [page, setPage] = useState(1);
  const [successFilter, setSuccessFilter] = useState<boolean | undefined>(
    undefined,
  );

  const { data, isLoading, error, refetch } = useUserLoginHistory(userId, {
    page,
    limit: 15,
    success: successFilter,
  });

  const entries = data?.data ?? [];
  const pagination = data?.pagination;

  const handleFilterAll = useCallback(() => {
    setSuccessFilter(undefined);
    setPage(1);
  }, []);

  const handleFilterSuccess = useCallback(() => {
    setSuccessFilter(true);
    setPage(1);
  }, []);

  const handleFilterFailed = useCallback(() => {
    setSuccessFilter(false);
    setPage(1);
  }, []);

  const handlePagePrev = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const handlePageNext = useCallback((totalPages: number) => {
    setPage((p) => Math.min(totalPages, p + 1));
  }, []);

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
          <CheckCircle className="h-3 w-3 mr-1 text-green-600 dark:text-green-400" />
          Successful
        </Button>
        <Button
          variant={successFilter === false ? "secondary" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={handleFilterFailed}
        >
          <XCircle className="h-3 w-3 mr-1 text-red-500 dark:text-red-400" />
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
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex shrink-0 items-center justify-between text-xs text-muted-foreground pt-1">
          <span>{pagination.total} events</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handlePagePrev}
              disabled={page === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-1">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => handlePageNext(pagination.totalPages)}
              disabled={page === pagination.totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
