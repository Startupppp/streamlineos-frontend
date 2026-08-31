import type {
  MacroVisibility,
  TicketPriority,
} from "@/hooks/api/support/macros";
import type { SupportTicketStatus } from "@/types/support";

export const NONE_VALUE = "__none__";

export const VISIBILITY_LABELS: Record<MacroVisibility, string> = {
  org: "Organization",
  team: "Team",
  private: "Private",
};

export const STATUS_OPTIONS: SupportTicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
  "RESOLVED",
  "CLOSED",
];

export const PRIORITY_OPTIONS: TicketPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

export function isMacroVisibility(value: string): value is MacroVisibility {
  return value === "org" || value === "team" || value === "private";
}

export function isTicketStatus(value: string): value is SupportTicketStatus {
  return (
    value === "OPEN" ||
    value === "IN_PROGRESS" ||
    value === "WAITING" ||
    value === "RESOLVED" ||
    value === "CLOSED"
  );
}

export function isTicketPriority(value: string): value is TicketPriority {
  return (
    value === "LOW" ||
    value === "MEDIUM" ||
    value === "HIGH" ||
    value === "URGENT"
  );
}
