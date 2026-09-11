"use client";

import { useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { useUserAuditLog } from "@/hooks/api/users";
import { getErrorMessage } from "@/lib/get-error-message";
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
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const currentCursor = cursorHistory.at(-1);

  const { data, isLoading, error, refetch } = useUserAuditLog(userId, {
    cursor: currentCursor,
    limit: 15,
  });

  const entries = data?.data ?? [];
  const pagination = data?.pagination;

  const handlePrevious = useCallback(() => {
    setCursorHistory((prev) => prev.slice(0, -1));
  }, []);

  const handleNext = useCallback(() => {
    if (pagination?.nextCursor) {
      setCursorHistory((prev) => [...prev, pagination.nextCursor ?? undefined]);
    }
  }, [pagination]);

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

      {(cursorHistory.length > 1 || pagination?.hasMore) && (
        <CursorPageControls
          page={cursorHistory.length}
          hasNext={pagination?.hasMore ?? false}
          onPrevious={handlePrevious}
          onNext={handleNext}
          className="shrink-0"
        />
      )}
    </div>
  );
}
