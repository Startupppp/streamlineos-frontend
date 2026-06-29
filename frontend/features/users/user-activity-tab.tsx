"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useUserActivity } from "@/hooks/api/users";
import { Activity } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface UserActivityTabProps {
  userId: string;
}

function formatAction(action: string): string {
  return action
    .split(/[._-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 24) return formatDistanceToNow(date, { addSuffix: true });
  return format(date, "MMM d, yyyy 'at' h:mm a");
}

export function UserActivityTab({ userId }: UserActivityTabProps) {
  const { data: activities, isLoading } = useUserActivity(userId);

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 items-start">
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <EmptyState
        compact
        illustration={<Activity className="h-10 w-10 text-muted-foreground/40" />}
        title="No activity recorded"
        description="Actions taken by or on this user will appear here."
      />
    );
  }

  return (
    <div className="pt-1 space-y-0">
      {activities.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            "flex gap-3 items-start py-3",
            index < activities.length - 1 && "border-b border-border/60"
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground leading-snug">
              {formatAction(item.action)}
              {item.resourceType && (
                <span className="text-muted-foreground font-normal">
                  {" "}· {item.resourceType}
                </span>
              )}
            </p>
            {item.ipAddress && (
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                {item.ipAddress}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {formatTimestamp(item.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
