"use client";

import { useCallback } from "react";
import { Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCompany360Timeline } from "@/hooks/api/crm";
import type { TimelineEvent } from "@/types/crm";

const TYPE_LABELS: Record<string, string> = {
  contact_created: "Contact added",
  deal_created: "Deal created",
  lead_linked: "Lead linked",
};

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
      <Clock className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{event.label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {TYPE_LABELS[event.type] ?? event.type}
          </span>
          {event.meta && (
            <span className="text-[10px] text-muted-foreground">· {event.meta}</span>
          )}
        </div>
      </div>
      <time className="text-[10px] text-muted-foreground whitespace-nowrap font-mono tabular-nums shrink-0">
        {new Date(event.date).toLocaleDateString()}
      </time>
    </div>
  );
}

interface Customer360TimelineProps {
  companyId: number;
}

export function Customer360Timeline({ companyId }: Customer360TimelineProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useCompany360Timeline(companyId);

  const allEvents = data?.pages.flatMap((p) => p.items) ?? [];

  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="px-4 py-3 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3">
        {allEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No activity recorded yet.</p>
        ) : (
          <>
            {allEvents.map((event, idx) => (
              <TimelineEventRow key={`${event.type}-${event.entityId}-${idx}`} event={event} />
            ))}
            {hasNextPage && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 h-7 text-xs text-muted-foreground"
                disabled={isFetchingNextPage}
                onClick={handleLoadMore}
              >
                {isFetchingNextPage ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Load more
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
