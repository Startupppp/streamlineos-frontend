"use client";

import { memo, useCallback, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowRight,
  CircleDot,
  Flag,
  Gauge,
  History,
  MessageSquare,
  Pencil,
  RefreshCw,
  Tag,
  Timer,
  UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyActivityIllustration } from "@/components/illustrations";
import {
  useTicketActivity,
  type TicketActivityAction,
  type TicketActivityEntry,
} from "@/hooks/api/build/ticket-activity";

interface TicketActivityLogProps {
  projectId: number;
  ticketId: number;
}

const ACTION_ICONS: Record<TicketActivityAction, LucideIcon> = {
  created: CircleDot,
  status_changed: Activity,
  priority_changed: Flag,
  assignee_changed: UserCog,
  title_changed: Pencil,
  sprint_changed: Timer,
  due_date_changed: Timer,
  comment_added: MessageSquare,
  comment_updated: MessageSquare,
  comment_deleted: MessageSquare,
  label_changed: Tag,
  estimate_changed: Gauge,
  cycle_changed: RefreshCw,
  type_changed: RefreshCw,
};

interface ActivityItemProps {
  entry: TicketActivityEntry;
}

const ActivityItem = memo(function ActivityItem({ entry }: ActivityItemProps) {
  const Icon = ACTION_ICONS[entry.action] ?? History;
  const actorName = entry.user?.name ?? "Someone";
  const timeAgo = entry.createdAt
    ? formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })
    : "";
  const showTransition = !!(entry.fromValue || entry.toValue);

  return (
    <li className="flex gap-2.5">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 text-xs leading-relaxed">
        <span className="font-medium text-foreground">{actorName}</span>{" "}
        <span className="text-muted-foreground">{entry.label}</span>
        {showTransition && (
          <span className="mt-0.5 flex flex-wrap items-center gap-1 text-muted-foreground">
            {entry.fromValue && (
              <span className="max-w-[16rem] truncate rounded bg-muted px-1.5 py-0.5 text-dense text-foreground/80 line-through decoration-muted-foreground/50" title={entry.fromValue}>
                {entry.fromValue}
              </span>
            )}
            {entry.toValue && (
              <>
                {entry.fromValue && <ArrowRight className="h-3 w-3 shrink-0" />}
                <span className="max-w-[16rem] truncate rounded bg-primary/10 px-1.5 py-0.5 text-dense text-primary" title={entry.toValue}>
                  {entry.toValue}
                </span>
              </>
            )}
          </span>
        )}
        {timeAgo && (
          <span className="mt-0.5 block text-micro text-muted-foreground">{timeAgo}</span>
        )}
      </div>
    </li>
  );
});

const ACTIVITY_RENDER_PAGE_SIZE = 25;

export function TicketActivityLog({ projectId, ticketId }: TicketActivityLogProps) {
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage, refetch } = useTicketActivity(projectId, ticketId);
  const [visibleCount, setVisibleCount] = useState(ACTIVITY_RENDER_PAGE_SIZE);
  const handleShowOlder = useCallback(
    async () => {
      if (visibleCount >= data.length && hasNextPage) {
        const result = await fetchNextPage();
        if (result.isError) return;
      }
      setVisibleCount((count) => count + ACTIVITY_RENDER_PAGE_SIZE);
    },
    [visibleCount, data.length, hasNextPage, fetchNextPage],
  );
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-1.5 text-dense font-medium uppercase tracking-wide text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        History
      </h4>

      {isLoading ? (
        <LoadingState variant="list" rows={8} className="p-0" />
      ) : isError && data.length === 0 ? (
        <p className="py-2 text-center text-dense text-muted-foreground">
          Could not load activity history.
          <button type="button" onClick={handleRetry}>Retry</button>
        </p>
      ) : !data || data.length === 0 ? (
        <EmptyState
          illustration={<EmptyActivityIllustration />}
          title="No activity yet"
          description="Changes to this ticket will appear here."
          compact
        />
      ) : (
        <>
          <ul className="space-y-3">
            {data.slice(0, visibleCount).map((entry) => (
              <ActivityItem key={entry.id} entry={entry} />
            ))}
          </ul>
          {isFetchNextPageError && <p role="alert">Could not load older activity. Try again.</p>}
          {(data.length > visibleCount || hasNextPage) && (
            <LoadingButton
              type="button"
              onClick={handleShowOlder}
              isPending={isFetchingNextPage}
              className="mx-auto block rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              Show older activity
              <span className="ml-1 tabular-nums opacity-70">
                ({Math.min(visibleCount, data.length)} loaded)
              </span>
            </LoadingButton>
          )}
        </>
      )}
    </div>
  );
}
