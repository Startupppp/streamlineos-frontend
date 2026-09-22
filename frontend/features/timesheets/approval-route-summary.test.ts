import { summarizeTimesheetApprover } from "./approval-route-summary";
import type { PeriodApproverPreview, TimesheetApprovalRoute } from "@/hooks/api/timesheets-core/timesheets-period-schema";

const APPROVER = { userId: "usr-manager", membershipId: 77, name: "Priya Menon", email: "priya@example.com", designation: "Engineering manager" };

const ROUTE: TimesheetApprovalRoute = {
  source: "reporting_manager",
  rung: "reporting_manager",
  approverUserId: APPROVER.userId,
  approverMembershipId: APPROVER.membershipId,
  assignedToUserId: APPROVER.userId,
  delegation: null,
  projectId: 9,
  explanation: "Priya Menon approves as reporting manager.",
  slaHours: 48,
  escalationRung: "managers_manager",
  escalatedFrom: null,
};

function preview(overrides: Partial<PeriodApproverPreview> = {}): PeriodApproverPreview {
  return {
    kind: "routed",
    approver: APPROVER,
    route: ROUTE,
    dueAt: "2026-09-23T09:00:00.000Z",
    explanation: "Priya Menon approves as reporting manager.",
    ...overrides,
  };
}

describe("summarizeTimesheetApprover feeds the shared approver panel", () => {
  it("maps a reporting-manager route to its rung, SLA and escalation", () => {
    expect(summarizeTimesheetApprover(preview())).toEqual({
      approver: APPROVER,
      queue: null,
      rungLabel: "Reporting manager",
      explanation: "Priya Menon approves as reporting manager.",
      slaHours: 48,
      escalationLabel: "manager's manager",
    });
  });

  it("labels a project-manager route by its source, escalating back to the reporting manager", () => {
    const summary = summarizeTimesheetApprover(
      preview({ route: { ...ROUTE, source: "project_manager", rung: null, escalationRung: "reporting_manager" } }),
    );

    expect(summary.rungLabel).toBe("Project manager");
    expect(summary.escalationLabel).toBe("reporting manager");
  });

  it("tells an auto-approving organisation there is no deadline and nobody to wait on", () => {
    const summary = summarizeTimesheetApprover(
      preview({
        kind: "auto",
        approver: null,
        dueAt: null,
        route: { ...ROUTE, source: "auto", rung: null, approverUserId: null, approverMembershipId: null, slaHours: 0, escalationRung: null },
      }),
    );

    expect(summary).toMatchObject({ approver: null, rungLabel: "Automatic", slaHours: 0, escalationLabel: null });
  });

  it("reads as unowned, never as empty, when nobody can approve", () => {
    expect(summarizeTimesheetApprover({ kind: "unowned", approver: null, route: null, dueAt: null, explanation: "Nobody can approve this timesheet." })).toEqual({
      approver: null,
      queue: null,
      rungLabel: null,
      explanation: "Nobody can approve this timesheet.",
      slaHours: 0,
      escalationLabel: null,
    });
  });
});
