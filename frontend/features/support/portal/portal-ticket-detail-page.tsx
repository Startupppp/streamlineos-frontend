"use client";

import { useCallback } from "react";
import { notFound } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, FileText, Image as ImageIcon } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePortalTicket } from "@/hooks/api/support/portal";
import { PortalReplyComposer } from "./portal-reply-composer";
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from "./portal-ticket-constants";

function fileMimeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  return FileText;
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

interface PortalTicketDetailPageProps {
  portalTicketId: number;
}

export function PortalTicketDetailPage({ portalTicketId }: PortalTicketDetailPageProps) {
  const { data: session } = useSession();
  const { data: ticket, isLoading, isError, refetch } = usePortalTicket(portalTicketId);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  if (!Number.isFinite(portalTicketId) || portalTicketId <= 0) {
    return notFound();
  }

  if (isLoading) {
    return (
      <PageWrapper variant="display" title="Loading..." backHref="/support/portal" noInternalScroll>
        <DetailSkeleton />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper variant="display" title="Support Ticket" backHref="/support/portal">
        <ErrorState onRetry={handleRetry} />
      </PageWrapper>
    );
  }

  if (!ticket) return notFound();

  const isClosed = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
  const currentUserId = session?.user?.id;

  return (
    <PageWrapper
      variant="display"
      title={ticket.title}
      backHref="/support/portal"
      badge={<Badge variant="outline" className={STATUS_COLORS[ticket.status]}>{STATUS_LABELS[ticket.status]}</Badge>}
      noInternalScroll
    >
      <div className="flex flex-col h-full min-h-0">
        <div className="shrink-0 pb-3 border-b border-border/40 flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={PRIORITY_COLORS[ticket.priority]}>
            {ticket.priority}
          </Badge>
          <span className="text-dense text-muted-foreground">
            Created {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
          </span>
          <span className="text-dense text-muted-foreground">
            Updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
          </span>
        </div>

        {isClosed && (
          <div className="shrink-0 mt-3 flex items-center gap-2 rounded-lg border border-status-success-rule bg-status-success-surface px-3 py-2 text-xs text-status-success-ink">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            This ticket is {ticket.status === "CLOSED" ? "closed" : "resolved"}. Sending a new reply will notify our support team.
          </div>
        )}

        <ScrollArea hideScrollbar className="min-h-0 flex-1">
          <div className="overscroll-contain space-y-3 py-3">
          {ticket.description && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm whitespace-pre-wrap">{ticket.description}</div>
          )}
          {ticket.messages.map((msg) => {
            const isMine = msg.authorId === currentUserId;
            return (
              <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg p-3",
                    isMine ? "bg-primary/10 border border-primary/20" : "bg-muted/40 border border-border/60",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">{isMine ? "You" : "Support Team"}</span>
                    <span className="text-micro text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-label whitespace-pre-wrap">{msg.body}</p>
                  {msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {msg.attachments.map((att, i) => {
                        const Icon = fileMimeIcon(att.mimeType);
                        return (
                          <a
                            key={i}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-dense text-primary hover:underline bg-primary/10 rounded px-2 py-0.5 border border-primary/30"
                          >
                            <Icon className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[120px]">{att.fileName}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </ScrollArea>

        <PortalReplyComposer ticketId={ticket.id} />
      </div>
    </PageWrapper>
  );
}
