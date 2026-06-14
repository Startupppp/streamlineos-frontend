"use client";

import { Phone, Mail, MapPin, Calendar, Clock, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { timeAgo } from "./leads-constants";
import type { LeadActivity } from "./leads-types";

interface LeadActivityTabProps {
  activities: LeadActivity[];
}

export function LeadActivityTab({ activities }: LeadActivityTabProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground/50">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activities yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3">
        {activities.map((activity: LeadActivity) => (
          <div
            key={activity.id}
            className="flex gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/30"
          >
            <div
              className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                activity.type === "call"
                  ? "bg-blue-500/15 text-blue-400"
                  : activity.type === "email"
                    ? "bg-purple-500/15 text-purple-400"
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
                <span className="text-[11px] text-muted-foreground">
                  {timeAgo(activity.date)}
                </span>
              </div>
              {activity.subject && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activity.subject}
                </p>
              )}
              {activity.notes && (
                <p className="text-xs mt-1.5 leading-relaxed">{activity.notes}</p>
              )}
              {activity.outcome && (
                <Badge variant="outline" className="text-[10px] mt-2">
                  {activity.outcome}
                </Badge>
              )}
              {activity.user && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
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
