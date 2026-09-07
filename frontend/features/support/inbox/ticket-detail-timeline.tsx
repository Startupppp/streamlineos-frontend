"use client";

import { formatDistanceToNow } from "date-fns";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import { SupportActivityLog } from "@/components/support/support-activity-log";
import { MessageTranslateControl } from "@/features/support/inbox/message-translate-control";
import type { SupportTicket } from "@/types/support";

function toSentenceCase(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

interface TicketDetailTimelineProps {
  ticket: SupportTicket;
}

export function TicketDetailTimeline({ ticket }: TicketDetailTimelineProps) {
  const messages = ticket.messages ?? [];

  return (
    <ScrollArea className="flex-1 px-4 py-3">
      {ticket.description && (
        <div className="bg-muted/30 rounded-lg p-3 mb-4 text-sm">
          {toSentenceCase(ticket.description)}
        </div>
      )}
      <div className="space-y-3">
        {messages.map((msg) => {
          const isInternalMsg = msg.isInternal;
          return (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2.5 rounded-lg p-3",
                isInternalMsg
                  ? "bg-status-warning-surface border border-status-warning-rule"
                  : "bg-muted/20",
              )}
            >
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarImage src={resolveImageUrl(msg.author?.image)} />
                <AvatarFallback className="text-micro">{getInitials(msg.author?.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">{msg.author?.name}</span>
                  {isInternalMsg && (
                    <Badge
                      variant="outline"
                      className="text-micro px-1 py-0 gap-0.5 border-status-warning-rule bg-status-warning-surface text-status-warning-ink"
                    >
                      <Lock className="h-2.5 w-2.5" /> Internal Note
                    </Badge>
                  )}
                  <span className="text-micro text-muted-foreground">
                    {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ""}
                  </span>
                </div>
                {msg.body && msg.body !== "(attachment)" && (
                  <p className="text-label mt-0.5 whitespace-pre-wrap">{msg.body}</p>
                )}
                {msg.body && msg.body !== "(attachment)" && (
                  <MessageTranslateControl ticketId={ticket.id} messageId={msg.id} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-border/40">
        <h4 className="text-dense font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Activity
        </h4>
        <SupportActivityLog supportTicketId={ticket.id} />
      </div>
    </ScrollArea>
  );
}
