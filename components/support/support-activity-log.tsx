"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowRightLeft,
  Flag,
  UserCog,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  Lock,
  PlusCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveImageUrl } from "@/lib/utils";
import { getApiError } from "@/lib/api-client";
import {
  useSupportActivity,
  type SupportActivityAction,
  type SupportActivityEntry,
} from "@/lib/api/hooks/support/activity";

const ACTION_ICONS: Record<SupportActivityAction, LucideIcon> = {
  created: PlusCircle,
  status_changed: ArrowRightLeft,
  priority_changed: Flag,
  assignee_changed: UserCog,
  replied: MessageSquare,
  internal_note: Lock,
  resolved: CheckCircle2,
  reopened: RotateCcw,
};

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function describeChange(entry: SupportActivityEntry) {
  if (entry.fromValue && entry.toValue) {
    return `${entry.fromValue} → ${entry.toValue}`;
  }
  if (entry.toValue) return entry.toValue;
  return null;
}

interface SupportActivityLogProps {
  supportTicketId: number;
}

export function SupportActivityLog({ supportTicketId }: SupportActivityLogProps) {
  const activityQuery = useSupportActivity(supportTicketId);

  if (activityQuery.isLoading) {
    return <LoadingState variant="list" rows={3} />;
  }

  if (activityQuery.error) {
    return (
      <ErrorState
        compact
        title="Couldn't load activity"
        description={getApiError(activityQuery.error)}
        onRetry={() => activityQuery.refetch()}
      />
    );
  }

  const entries = activityQuery.data ?? [];

  if (entries.length === 0) {
    return (
      <EmptyState
        compact
        icon={Activity}
        title="No activity yet"
        description="Status, priority, and assignment changes will appear here."
      />
    );
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry) => {
        const Icon = ACTION_ICONS[entry.action] ?? Activity;
        const change = describeChange(entry);
        return (
          <li key={entry.id} className="flex gap-2.5">
            <div className="flex flex-col items-center shrink-0">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className="h-3 w-3" />
              </span>
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Avatar className="h-4 w-4 shrink-0">
                  <AvatarImage src={resolveImageUrl(entry.userImage)} />
                  <AvatarFallback className="text-[8px]">
                    {getInitials(entry.userName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium truncate">
                  {entry.userName ?? "System"}
                </span>
                <span className="text-xs text-muted-foreground">{entry.label}</span>
                {entry.createdAt && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
              {change && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {change}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
