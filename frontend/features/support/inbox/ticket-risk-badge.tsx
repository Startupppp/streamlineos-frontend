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
  first_response_due_soon: "bg-amber-100 text-amber-700 border-amber-200",
  resolution_due_soon: "bg-amber-100 text-amber-700 border-amber-200",
  first_response_breached: "bg-red-100 text-red-700 border-red-200",
  resolution_breached: "bg-red-100 text-red-700 border-red-200",
  paused: "bg-slate-100 text-slate-600 border-slate-200",
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
