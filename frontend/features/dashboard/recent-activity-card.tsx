"use client";

import { memo } from "react";
import Link from "next/link";
import { Activity, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveImageUrl } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getInitials } from "@/lib/format-utils";
import { formatDistanceToNow } from "date-fns";
import { isTicketType, typeIcons, DEFAULT_TICKET_ICON } from "./ticket-types";

interface ActivityItem {
  id: string | number;
  type?: string | null;
  status?: string | null;
  ticketNumber?: number | string;
  title?: string | null;
  projectId?: number | null;
  projectKey?: string | null;
  projectName?: string | null;
  updatedAt?: string | Date | null;
  assignee?: {
    image?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

interface RecentActivityCardProps {
  items: ActivityItem[] | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
}

export const RecentActivityCard = memo(function RecentActivityCard({ items, isLoading, error, onRetry }: RecentActivityCardProps) {
  return (
    <Card className="bg-card border-border shadow-noir flex flex-col h-full w-full">
      <CardHeader className="flex-shrink-0 px-4 py-3">
        <CardTitle className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden px-4 pt-0 pb-4" aria-live="polite">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={`activity-skel-${i}`} className="h-14 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="space-y-2 py-2">
            <p role="alert" className="text-sm text-destructive">{getErrorMessage(error)}</p>
            {onRetry && (
              <Button variant="ghost" size="sm" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Retry
              </Button>
            )}
          </div>
        ) : items && items.length > 0 ? (
          <ScrollArea className="h-full pr-2">
            <div className="space-y-1.5">
              {items.map((item) => {
                const TypeIcon = isTicketType(item.type) ? typeIcons[item.type] : DEFAULT_TICKET_ICON;
                return (
                  <Link key={item.id} href={item.projectId ? `/build/${item.projectId}` : "/build/all"}>
                    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <TypeIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">
                            {item.projectKey ?? "???"}-{item.ticketNumber ?? "?"}
                          </span>
                          <Badge variant="outline" className="text-micro px-1.5 py-0">
                            {item.status?.replaceAll("_", " ")}
                          </Badge>
                        </div>
                        <TruncatedText text={item.title ?? ""} className="text-sm font-medium text-foreground" />
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{item.projectName}</span>
                          {item.updatedAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      {item.assignee && (
                        <Avatar className="w-8 flex-shrink-0">
                          <AvatarImage src={resolveImageUrl(item.assignee.image)} />
                          <AvatarFallback className="text-micro">
                            {getInitials(null, item.assignee.firstName, item.assignee.lastName)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <EmptyState
            illustration={<EmptyActivityIllustration />}
            title="No recent activity"
            description="Ticket updates will appear here as your team works."
          />
        )}
      </CardContent>
    </Card>
  );
});
