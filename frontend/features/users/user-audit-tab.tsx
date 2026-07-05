"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useUserAuditLog } from "@/hooks/api/users";
import { ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [page, setPage] = useState(1);
  const { data, isLoading } = useUserAuditLog(userId, { page, limit: 15 });

  const entries = data?.data ?? [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        compact
        illustrationPreset="security"
        title="No audit events"
        description="No activity has been logged for this user yet."
      />
    );
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-md border px-3 py-2 text-xs"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium capitalize">{friendlyAction(entry.action)}</p>
              {entry.actorUserId && entry.actorUserId !== userId && (
                <p className="text-muted-foreground mt-0.5 truncate">
                  by {entry.actorUserId}
                </p>
              )}
            </div>
            <span className="text-muted-foreground shrink-0 mt-0.5">
              {format(new Date(entry.createdAt), "MMM d, HH:mm")}
            </span>
          </div>
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>{pagination.total} events</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-1">{page} / {pagination.totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
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
