import { render, screen } from "@testing-library/react";
import { ApprovalRouteCell } from "./approval-route-cell";
import type { TimesheetApprovalRoute } from "@/hooks/api/timesheets-core/timesheets-period-schema";

const NOW = new Date("2026-09-22T10:00:00.000Z");

function route(overrides: Partial<TimesheetApprovalRoute> = {}): TimesheetApprovalRoute {
  return {
    source: "reporting_manager",
    rung: "reporting_manager",
    approverUserId: "usr-manager",
    approverMembershipId: 77,
    assignedToUserId: "usr-manager",
    delegation: null,
    projectId: null,
    explanation: "Priya Menon approves as reporting manager.",
    slaHours: 48,
    escalationRung: "managers_manager",
    escalatedFrom: null,
    ...overrides,
  };
}

describe("ApprovalRouteCell shows the queue why a period landed with its approver", () => {
  it("names the rung and the deadline while the period is still awaiting a decision", () => {
    render(<ApprovalRouteCell period={{ status: "SUBMITTED", approvalRoute: route(), approvalDueAt: "2026-09-23T09:00:00.000Z", approvalEscalatedAt: null }} now={NOW} />);

    expect(screen.getByText("Reporting manager")).toBeInTheDocument();
    expect(screen.getByText(/^Due /)).toBeInTheDocument();
    expect(screen.queryByText("escalated")).not.toBeInTheDocument();
  });

  it("flags an overdue period and marks one the sweep has moved up the chain", () => {
    render(
      <ApprovalRouteCell
        period={{
          status: "SUBMITTED",
          approvalRoute: route({ rung: "managers_manager", escalatedFrom: { approverUserId: "usr-manager", rung: "reporting_manager", at: "2026-09-21T00:00:00.000Z" } }),
          approvalDueAt: "2026-09-21T09:00:00.000Z",
          approvalEscalatedAt: "2026-09-21T00:00:00.000Z",
        }}
        now={NOW}
      />,
    );

    expect(screen.getByText("Manager's manager")).toBeInTheDocument();
    expect(screen.getByText("escalated")).toBeInTheDocument();
    expect(screen.getByText(/^Overdue since /)).toBeInTheDocument();
  });

  it("drops the deadline once the period is decided, and spells out the reason when asked", () => {
    render(<ApprovalRouteCell period={{ status: "APPROVED", approvalRoute: route({ source: "project_manager", rung: null }), approvalDueAt: null, approvalEscalatedAt: null }} now={NOW} detailed />);

    expect(screen.getByText("Project manager")).toBeInTheDocument();
    expect(screen.getByText("Priya Menon approves as reporting manager.")).toBeInTheDocument();
    expect(screen.queryByText(/Due|Overdue/)).not.toBeInTheDocument();
  });

  it("renders a dash for a period that was never routed", () => {
    render(<ApprovalRouteCell period={{ status: "OPEN", approvalRoute: null, approvalDueAt: null, approvalEscalatedAt: null }} now={NOW} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
