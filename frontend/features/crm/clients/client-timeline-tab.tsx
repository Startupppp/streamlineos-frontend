"use client";

import { useCallback } from "react";
import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientTimeline } from "@/hooks/api/crm/clients";
import { formatDateTime } from "./utils";
import type { ClientTimelineEvent } from "@/types/crm";

export function ClientTimelineTab({ clientId }: { clientId: number }) {
  const { data, isLoading, isError, refetch } = useClientTimeline(clientId);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-2 py-2" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        compact
        title="Couldn't load the timeline"
        description="This client's activity didn't load. Check your connection and try again."
        onRetry={handleRetry}
      />
    );
  }

  if (!data?.events.length) {
    return (
      <EmptyState
        title="Nothing has happened yet"
        description="Calls, emails, meetings and renewals on this account appear here as they happen."
        compact
        className="py-10"
      />
    );
  }

  return (
    <div className="space-y-0">
      {data.events.map((event: ClientTimelineEvent) => (
        <div
          key={event.id}
          className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0"
        >
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-dense font-medium text-foreground truncate">{event.title}</p>
            <p className="text-dense text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
            <p className="text-micro text-muted-foreground mt-0.5">
              {formatDateTime(event.date)}
              {event.user && ` · ${event.user}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
