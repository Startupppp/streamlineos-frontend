"use client";

import { Badge } from "@/components/ui/badge";
import { useTicketRisk, type TicketRiskLevel } from "@/hooks/api/support/ticket-risk";

const RISK_LABEL: Partial<Record<TicketRiskLevel, string>> = {
  first_response_due_soon: "Due soon",
  resolution_due_soon: "Due soon",
  first_response_breached: "Breached",
  resolution_breached: "Breached",
  paused: "Paused",
};

const RISK_CLASS: Partial<Record<TicketRiskLevel, string>> = {
  first_response_due_soon: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  resolution_due_soon: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  first_response_breached: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  resolution_breached: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  paused: "bg-muted text-muted-foreground border-border",
};

interface TicketRiskBadgeProps {
  ticketId: number;
}

export function TicketRiskBadge({ ticketId }: TicketRiskBadgeProps) {
  const { data } = useTicketRisk(ticketId);

  if (!data || data.risk === "ok") return null;

  return (
    <Badge variant="outline" className={`text-xs ${RISK_CLASS[data.risk]}`}>
      {RISK_LABEL[data.risk]}
    </Badge>
  );
}
