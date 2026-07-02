"use client";

import { Clock } from "lucide-react";
import { formatDateTime } from "./utils";
import type { ClientActivity } from "@/types/crm";

export function ActivityItem({ activity }: { activity: ClientActivity }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Clock className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-foreground">{activity.title}</p>
        {activity.description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
            {activity.description}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {formatDateTime(activity.createdAt)}
          {activity.user?.name && ` · ${activity.user.name}`}
        </p>
      </div>
    </div>
  );
}
