"use client";

import { AlertTriangle, ArrowUpRight, Lock } from "lucide-react";
import { SemanticBadge, type BadgeTone } from "@/components/ui/semantic-badge";
import { SUPPORT_QUEUE_LABELS, type SupportQueue } from "@/lib/employee-support";
import { formatShortDate } from "@/lib/date-utils";
import type { TicketPriority, TicketStatus } from "@/hooks/api/hr/helpdesk-schema";

export const REQUEST_STATUS_LABELS: Record<TicketStatus, string> = {
  TODO: "Open",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Resolved",
};

const REQUEST_STATUS_TONES: Record<TicketStatus, BadgeTone> = {
  TODO: "neutral",
  IN_PROGRESS: "info",
  IN_REVIEW: "warning",
  DONE: "success",
};

export const REQUEST_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const REQUEST_PRIORITY_TONES: Record<TicketPriority, BadgeTone> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "orange",
  URGENT: "danger",
};

export function RequestStatusBadge({ status }: { status: TicketStatus }) {
  return <SemanticBadge tone={REQUEST_STATUS_TONES[status]} label={REQUEST_STATUS_LABELS[status]} size="xs" />;
}

export function RequestPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <SemanticBadge tone={REQUEST_PRIORITY_TONES[priority]} label={REQUEST_PRIORITY_LABELS[priority]} size="xs" />;
}

export function QueueBadge({ queue }: { queue: SupportQueue }) {
  return <SemanticBadge tone="accent" label={SUPPORT_QUEUE_LABELS[queue]} size="xs" />;
}

export function ConfidentialBadge() {
  return (
    <SemanticBadge
      tone="teal"
      size="xs"
      label="Confidential"
      icon={<Lock className="h-3 w-3" aria-hidden="true" />}
    />
  );
}

export interface SlaMarkerInput {
  status: TicketStatus;
  firstResponseDueAt: string | null;
  firstRespondedAt: string | null;
  slaDueAt: string | null;
  escalatedAt: string | null;
}

export type SlaVerdict =
  | { kind: "resolved" }
  | { kind: "escalated"; at: string }
  | { kind: "overdue"; breach: "first_response" | "resolution"; dueAt: string }
  | { kind: "due"; dueAt: string }
  | { kind: "none" };

export function slaVerdict(ticket: SlaMarkerInput, now: Date): SlaVerdict {
  if (ticket.status === "DONE") return { kind: "resolved" };
  if (ticket.escalatedAt) return { kind: "escalated", at: ticket.escalatedAt };
  if (ticket.slaDueAt && new Date(ticket.slaDueAt).getTime() < now.getTime())
    return { kind: "overdue", breach: "resolution", dueAt: ticket.slaDueAt };
  if (
    ticket.firstResponseDueAt &&
    ticket.firstRespondedAt === null &&
    new Date(ticket.firstResponseDueAt).getTime() < now.getTime()
  )
    return { kind: "overdue", breach: "first_response", dueAt: ticket.firstResponseDueAt };
  if (ticket.slaDueAt) return { kind: "due", dueAt: ticket.slaDueAt };
  return { kind: "none" };
}

export function SlaMarker({ ticket, now = new Date() }: { ticket: SlaMarkerInput; now?: Date }) {
  const verdict = slaVerdict(ticket, now);
  switch (verdict.kind) {
    case "resolved":
    case "none":
      return null;
    case "escalated":
      return (
        <SemanticBadge
          tone="danger"
          size="xs"
          label="Escalated"
          icon={<ArrowUpRight className="h-3 w-3" aria-hidden="true" />}
        />
      );
    case "overdue":
      return (
        <SemanticBadge
          tone="danger"
          size="xs"
          label={verdict.breach === "first_response" ? "Response overdue" : "Overdue"}
          icon={<AlertTriangle className="h-3 w-3" aria-hidden="true" />}
        />
      );
    case "due":
      return <SemanticBadge tone="neutral" size="xs" label={`Due ${formatShortDate(verdict.dueAt)}`} />;
  }
}
