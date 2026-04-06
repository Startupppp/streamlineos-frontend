"use client";

import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { TIMELINE_ICONS } from "./lead-types";

interface TimelineItem {
  id: number | string;
  type: string;
  timestamp?: string | Date | null;
  data: Record<string, unknown>;
}

interface LeadActivityTimelineProps {
  timeline: TimelineItem[] | undefined;
  isLoading: boolean;
}

export function LeadActivityTimeline({
  timeline,
  isLoading,
}: LeadActivityTimelineProps) {
  return (
    <Card className="shadow-noir">
      <CardHeader>
        <CardTitle className="text-base">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : timeline && timeline.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border/50" />
              <div className="space-y-4">
                {timeline.map((item) => {
                  const config =
                    TIMELINE_ICONS[item.type] ?? TIMELINE_ICONS.note;
                  const ItemIcon = config.icon;
                  const data = item.data;
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="relative flex gap-4 pl-10"
                    >
                      <div
                        className={cn(
                          "absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center",
                          config.color
                        )}
                      >
                        <ItemIcon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 p-3 rounded-lg bg-muted/20 border border-border/30">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {item.type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.timestamp
                              ? new Date(item.timestamp).toLocaleDateString()
                              : ""}
                          </span>
                        </div>

                        {item.type === "note" && (
                          <p className="text-sm mt-1">
                            {String(data.body ?? "")}
                          </p>
                        )}

                        {item.type === "task" && (
                          <div className="mt-1">
                            <p className="text-sm">{String(data.title ?? "")}</p>
                            {typeof data.status === "string" && data.status && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] mt-1"
                              >
                                {data.status}
                              </Badge>
                            )}
                          </div>
                        )}

                        {item.type === "email" && (
                          <div className="mt-1">
                            <p className="text-sm font-medium">
                              {String(data.subject ?? "")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {String(data.direction ?? "sent")} -{" "}
                              {String(data.toEmail ?? "")}
                            </p>
                          </div>
                        )}

                        {item.type === "activity" && (
                          <div className="mt-1">
                            {data.subject ? (
                              <p className="text-sm">{String(data.subject)}</p>
                            ) : null}
                            {data.notes ? (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {String(data.notes)}
                              </p>
                            ) : null}
                          </div>
                        )}

                        {data.author ? (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {String(
                              (data.author as Record<string, unknown>).name ??
                                ""
                            )}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground/60">
            <p className="text-sm">No activities recorded yet</p>
            <p className="text-xs mt-1">
              Log your first interaction with this lead
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
