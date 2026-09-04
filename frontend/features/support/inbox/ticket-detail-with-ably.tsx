"use client";

import { SupportAblyProvider } from "./support-ably-provider";
import { TicketDetailSheet } from "./ticket-detail-sheet";

interface TicketDetailWithAblyProps {
  ticketId: number;
  onBack: () => void;
}

export function TicketDetailWithAbly({ ticketId, onBack }: TicketDetailWithAblyProps) {
  return (
    <SupportAblyProvider>
      <TicketDetailSheet ticketId={ticketId} onBack={onBack} />
    </SupportAblyProvider>
  );
}
