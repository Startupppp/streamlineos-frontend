import { format, parseISO } from "date-fns";

/**
 * HRMS-E2E-013. A leave row on `/hr/approvals` has to say which days are being
 * asked for, in the width a queue row allows.
 *
 * Kept out of the component so it can be asserted directly: a single day must
 * not read as a range, and an unparseable date must not throw inside a list that
 * also holds good rows.
 */
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

/**
 * V-044. A queue row that does not say where it is routed cannot be triaged —
 * an HR admin looking at the shared queue has no way to tell which rows are
 * theirs. Names the queue when the request sits in one, otherwise the resolved
 * approver and the rung they were reached by, and nothing at all when the
 * backend sent no route (rather than inventing one).
 */
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
