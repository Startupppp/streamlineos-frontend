import { format, parseISO } from "date-fns";

export function formatDateRange(startDate: string, endDate: string): string {
  const start = safeFormat(startDate);
  const end = safeFormat(endDate);
  if (start === null) return startDate;
  if (end === null || startDate === endDate) return start;
  return `${start} – ${end}`;
}

function safeFormat(value: string): string | null {
  try {
    const parsed = parseISO(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return format(parsed, "MMM d");
  } catch {
    return null;
  }
}

const RUNG_LABEL: Record<string, string> = {
  reporting_manager: "reporting manager",
  managers_manager: "manager's manager",
  department_head: "department head",
  queue: "approvals queue",
};

export interface LeaveRowApprovalRoute {
  rung?: string | null;
  queue?: { label: string } | null;
  approver?: { name: string | null } | null;
}

export function approvalRouteTargetLabel(
  route: LeaveRowApprovalRoute | null | undefined,
): string | null {
  if (!route) return null;
  if (route.queue?.label) return `Routed to ${route.queue.label}`;
  const name = route.approver?.name;
  if (name) {
    const rung = route.rung ? RUNG_LABEL[route.rung] : undefined;
    return rung ? `Routed to ${name} (${rung})` : `Routed to ${name}`;
  }
  const rung = route.rung ? RUNG_LABEL[route.rung] : undefined;
  return rung ? `Routed to the ${rung}` : null;
}
