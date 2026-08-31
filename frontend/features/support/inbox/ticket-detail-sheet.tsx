"use client";

import { useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupportTicket } from "@/hooks/api/support";
import { useSupportRealtime } from "@/hooks/api/support/realtime";
import { TicketDetailHeader } from "./ticket-detail-header";
import { TicketDetailTimeline } from "./ticket-detail-timeline";
import { TicketDetailRelations } from "./ticket-detail-relations";
import { TicketExternalLinksSection } from "./ticket-external-links-section";
import { TicketReplyComposer } from "./ticket-reply-composer";
import { KbDeflectionPanel } from "./ticket-kb-deflection-panel";
import { TicketAiPanel } from "./ticket-ai-panel";
import { SUPPORT_INSERT_REPLY_DRAFT_EVENT, type SupportInsertReplyDraftDetail } from "./use-inbox-shortcuts";

interface TicketDetailSheetProps {
  ticketId: number;
  onBack: () => void;
}

export function TicketDetailSheet({ ticketId, onBack }: TicketDetailSheetProps) {
  const { data: ticket, isLoading } = useSupportTicket(ticketId);
  useSupportRealtime(ticketId > 0 ? ticketId : null);

  const handleInsertReply = useCallback((body: string) => {
    window.dispatchEvent(
      new CustomEvent<SupportInsertReplyDraftDetail>(SUPPORT_INSERT_REPLY_DRAFT_EVENT, {
        detail: { body },
      }),
    );
  }, []);

  if (isLoading || !ticket) {
    return (
      <div className="flex-1 flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-64" />
        <div className="flex-1 space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className="h-16 flex-1 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TicketDetailHeader ticket={ticket} onBack={onBack} onInsertReply={handleInsertReply} />
      <TicketDetailTimeline ticket={ticket} />
      <TicketDetailRelations ticketId={ticket.id} />
      <TicketExternalLinksSection ticketId={ticket.id} />
      <TicketAiPanel ticketId={ticket.id} onInsertReply={handleInsertReply} />
      <TicketReplyComposer key={ticket.id} ticketId={ticket.id} />
      <KbDeflectionPanel ticketId={ticket.id} ticketTitle={ticket.title} />
    </div>
  );
}
