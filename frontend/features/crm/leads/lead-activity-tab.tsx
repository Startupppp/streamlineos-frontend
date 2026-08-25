"use client";

import { Phone, Mail, MapPin, Calendar, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
function timeAgo(date: string | Date) {
  const now = new Date();
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 0) {
    const absDiff = Math.abs(diff);
    if (absDiff < 3600) return `in ${Math.floor(absDiff / 60)}m`;
    if (absDiff < 86400) return `in ${Math.floor(absDiff / 3600)}h`;
    return `in ${Math.floor(absDiff / 86400)}d`;
  }
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}
import type { LeadActivity } from "./leads-types";

interface LeadActivityTabProps {
  activities: LeadActivity[];
}

export function LeadActivityTab({ activities }: LeadActivityTabProps) {
  if (activities.length === 0) {
    return <EmptyState illustration={<EmptyActivityIllustration />} title="No activities yet" compact />;
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3">
        {activities.map((activity: LeadActivity) => (
          <div
            key={activity.id}
            className="flex gap-3 p-3 rounded-lg bg-muted/20 border border-border"
          >
            <div
              className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                activity.type === "call"
                  ? "bg-blue-500/15 text-blue-400"
                  : activity.type === "email"
                    ? "bg-blue-500/15 text-blue-400"
                    : activity.type === "whatsapp"
                      ? "bg-green-500/15 text-green-400"
                      : activity.type === "meeting"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-cyan-500/15 text-cyan-400",
              )}
            >
              {activity.type === "call" ? (
                <Phone className="h-4 w-4" />
              ) : activity.type === "email" ? (
                <Mail className="h-4 w-4" />
              ) : activity.type === "whatsapp" ? (
                <MessageSquare className="h-4 w-4" />
              ) : activity.type === "meeting" ? (
                <Calendar className="h-4 w-4" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium capitalize">
                  {activity.type.replace("_", "")}
                </p>
                <span className="text-dense text-muted-foreground">
                  {timeAgo(activity.date)}
                </span>
              </div>
              {activity.subject && (
                <TruncatedText text={activity.subject} className="text-xs text-muted-foreground mt-0.5" />
              )}
              {activity.notes && (
                <p className="text-xs mt-1.5 leading-relaxed line-clamp-3">{activity.notes}</p>
              )}
              {activity.outcome && (
                <Badge variant="outline" className="text-micro mt-2">
                  {activity.outcome}
                </Badge>
              )}
              {activity.user && (
                <p className="text-micro text-muted-foreground mt-1.5">
                  by {activity.user.name}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
