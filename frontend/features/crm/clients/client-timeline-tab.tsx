"use client";

import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useClientTimeline } from "@/hooks/api/crm/clients";
import { formatDateTime } from "./utils";
import type { ClientTimelineEvent } from "@/types/crm";

export function ClientTimelineTab({ clientId }: { clientId: number }) {
  const { data, isLoading } = useClientTimeline(clientId);

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.events.length) {
    return (
      <EmptyState
        title="No timeline events"
        description="Activity for this client will appear here."
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
            <p className="text-[11px] font-medium text-foreground truncate">{event.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatDateTime(event.date)}
              {event.user && ` · ${event.user}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
