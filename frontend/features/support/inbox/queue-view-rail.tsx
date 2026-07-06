"use client";

import { useCallback } from "react";
import { Inbox, Layers, Bookmark } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSupportQueues } from "@/hooks/api/support/queues";
import { useSupportSavedViews } from "@/hooks/api/support/views";

interface QueueViewRailProps {
  activeQueueId: number | null;
  onSelectQueue: (queueId: number | null) => void;
  onApplyView: (filter: Record<string, unknown>) => void;
}

export function QueueViewRail({ activeQueueId, onSelectQueue, onApplyView }: QueueViewRailProps) {
  const { data: queues, isLoading: queuesLoading } = useSupportQueues();
  const { data: views, isLoading: viewsLoading } = useSupportSavedViews();

  const handleSelectAll = useCallback(() => onSelectQueue(null), [onSelectQueue]);

  return (
    <div className="w-full md:w-[220px] border-r border-border/40 flex flex-col overflow-hidden shrink-0 bg-card/50">
      <ScrollArea className="flex-1">
        <div className="px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-1.5">
            Queues
          </p>
          <button
            type="button"
            onClick={handleSelectAll}
            className={cn(
              "w-full flex items-center gap-2 text-left text-[13px] rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors",
              activeQueueId === null && "bg-muted/60 font-medium",
            )}
          >
            <Inbox className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            All tickets
          </button>
          {queuesLoading ? (
            <div className="space-y-1.5 mt-1.5 px-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-4 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            (queues ?? []).map((queue) => (
              <button
                key={queue.id}
                type="button"
                onClick={() => onSelectQueue(queue.id)}
                className={cn(
                  "w-full flex items-center gap-2 text-left text-[13px] rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors",
                  activeQueueId === queue.id && "bg-muted/60 font-medium",
                )}
              >
                <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{queue.name}</span>
                {queue.openTicketCount > 0 && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {queue.openTicketCount}
                  </span>
                )}
              </button>
            ))
          )}

          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-1.5 mt-4">
            Saved Views
          </p>
          {viewsLoading ? (
            <div className="space-y-1.5 px-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-4 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (views ?? []).length === 0 ? (
            <p className="text-[11px] text-muted-foreground px-2">No saved views yet</p>
          ) : (
            (views ?? []).map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => onApplyView(view.filter)}
                className="w-full flex items-center gap-2 text-left text-[13px] rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
              >
                <Bookmark className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{view.name}</span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
