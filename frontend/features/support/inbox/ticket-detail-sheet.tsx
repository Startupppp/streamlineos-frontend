"use client";

import { useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useSupportTicket } from "@/hooks/api/support";
import { useSupportRealtime } from "@/hooks/api/support/realtime";
import { TicketDetailHeader } from "./ticket-detail-header";
import { TicketDetailTimeline } from "./ticket-detail-timeline";
import { TicketDetailRelations } from "./ticket-detail-relations";
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
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TicketDetailHeader ticket={ticket} onBack={onBack} />
      <TicketDetailTimeline ticket={ticket} />
      <TicketDetailRelations ticketId={ticket.id} />
      <TicketAiPanel ticketId={ticket.id} onInsertReply={handleInsertReply} />
      <TicketReplyComposer ticketId={ticket.id} />
      <KbDeflectionPanel ticketId={ticket.id} ticketTitle={ticket.title} />
    </div>
  );
}
