"use client";

import type { ElementType } from "react";
import { formatDistanceToNow } from "date-fns";
import { UserPlus, TrendingUp, Link2, FileText, Clock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { OrgTimelineEvent, OrgTimelineEventType } from "@/types/crm";

const eventConfig: Record<
  OrgTimelineEventType,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  contact_created: { icon: UserPlus, color: "text-blue-400", bg: "bg-blue-500/15" },
  deal_created: { icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-500/10" },
  lead_linked: { icon: Link2, color: "text-purple-400", bg: "bg-purple-500/15" },
  note_added: { icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/15" },
};

interface AccountTimelineProps {
  events: OrgTimelineEvent[];
}

export function AccountTimeline({ events }: AccountTimelineProps) {
  if (events.length === 0) {
    return <EmptyState icon={Clock} title="No activity yet" compact />;
  }

  return (
    <ol className="relative border-l border-border/60 ml-2 space-y-4">
      {events.map((event) => {
        const config = eventConfig[event.type];
        const Icon = config.icon;
        return (
          <li key={event.id} className="ml-4">
            <span
              className={cn(
                "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-background",
                config.bg,
              )}
            >
              <Icon className={cn("h-3 w-3", config.color)} />
            </span>
            <p className="text-sm text-foreground">{event.description}</p>
            <time className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(event.date), { addSuffix: true })}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
