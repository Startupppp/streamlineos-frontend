"use client";

import { memo } from "react";
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
import { EmptyActivityIllustration } from "@/components/illustrations";
import {
  useTicketActivity,
  type TicketActivityAction,
  type TicketActivityEntry,
} from "@/hooks/api/projects/ticket-activity";

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
          <span className="mt-0.5 flex flex-wrap items-center gap-1 text-muted-foreground/90">
            {entry.fromValue && (
              <span className="truncate rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground/80 line-through decoration-muted-foreground/50">
                {entry.fromValue}
              </span>
            )}
            {entry.toValue && (
              <>
                {entry.fromValue && <ArrowRight className="h-3 w-3 shrink-0" />}
                <span className="truncate rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                  {entry.toValue}
                </span>
              </>
            )}
          </span>
        )}
        {timeAgo && (
          <span className="mt-0.5 block text-[10px] text-muted-foreground/70">{timeAgo}</span>
        )}
      </div>
    </li>
  );
});

export function TicketActivityLog({ projectId, ticketId }: TicketActivityLogProps) {
  const { data, isLoading, isError } = useTicketActivity(projectId, ticketId);

  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        History
      </h4>

      {isLoading ? (
        <LoadingState variant="list" rows={8} className="p-0" />
      ) : isError ? (
        <p className="py-2 text-center text-[11px] text-muted-foreground">
          Could not load activity history.
        </p>
      ) : !data || data.length === 0 ? (
        <EmptyState
          illustration={<EmptyActivityIllustration />}
          title="No activity yet"
          description="Changes to this ticket will appear here."
          compact
        />
      ) : (
        <ul className="space-y-3">
          {data.map((entry) => (
            <ActivityItem key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}
