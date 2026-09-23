import { APPROVAL_RUNG_LABELS, type ApprovalRouteSummary } from "@/components/shared/approval-route-panel";
import type { ApprovalRung } from "@/hooks/api/hr/approval-route-schema";
import type { PeriodApproverPreview, TimesheetApprovalRoute } from "@/hooks/api/timesheets-core/timesheets-period-schema";

function isApprovalRung(value: string | null): value is ApprovalRung {
  return value !== null && value in APPROVAL_RUNG_LABELS;
}

export function timesheetRouteRungLabel(route: TimesheetApprovalRoute): string {
  if (route.source === "auto") return "Automatic";
  if (route.source === "project_manager") return "Project manager";
  return isApprovalRung(route.rung) ? APPROVAL_RUNG_LABELS[route.rung] : "Reporting manager";
}

export function timesheetRouteEscalationLabel(route: TimesheetApprovalRoute): string | null {
  return isApprovalRung(route.escalationRung) ? APPROVAL_RUNG_LABELS[route.escalationRung].toLowerCase() : null;
}

export function summarizeTimesheetApprover(preview: PeriodApproverPreview): ApprovalRouteSummary {
  if (preview.kind === "unowned" || preview.route === null)
    return { approver: null, queue: null, rungLabel: null, explanation: preview.explanation, slaHours: 0, escalationLabel: null };
  return {
    approver: preview.approver,
    queue: null,
    rungLabel: timesheetRouteRungLabel(preview.route),
    explanation: preview.explanation,
    slaHours: preview.route.slaHours,
    escalationLabel: timesheetRouteEscalationLabel(preview.route),
  };
}
