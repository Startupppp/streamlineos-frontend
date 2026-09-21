import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-client";
import { ApprovalRoutePanel } from "./approval-route-panel";
import type { ApprovalRoute } from "@/hooks/api/hr/approval-route-schema";

function route(overrides: Partial<ApprovalRoute> = {}): ApprovalRoute {
  return {
    kind: "leave",
    subjectUserId: "employee-1",
    permission: "hr:leaves:approve",
    resolvedAt: "2026-09-21T00:00:00.000Z",
    rung: "reporting_manager",
    assignedTo: { userId: "manager-1", membershipId: 5, name: "Jane Doe", email: "jane@example.com", designation: "Engineering manager" },
    approver: { userId: "manager-1", membershipId: 5, name: "Jane Doe", email: "jane@example.com", designation: "Engineering manager" },
    delegation: null,
    queue: null,
    skipped: [],
    slaHours: 48,
    dueAt: "2026-09-23T00:00:00.000Z",
    escalation: { rung: "managers_manager", approver: null, queue: null },
    explanation: "Jane Doe approves as reporting manager.",
    ...overrides,
  };
}

describe("ApprovalRoutePanel tells the employee who approves and why", () => {
  it("names the reporting manager, the reason, the SLA and where it escalates", () => {
    render(<ApprovalRoutePanel route={route()} isLoading={false} error={null} />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Engineering manager")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe approves as reporting manager.")).toBeInTheDocument();
    expect(screen.getByText(/Reporting manager · expected within 48h · escalates to manager's manager/)).toBeInTheDocument();
  });

  it("names the queue and its size when no manager in the chain can act", () => {
    render(
      <ApprovalRoutePanel
        route={route({
          rung: "queue",
          assignedTo: null,
          approver: null,
          escalation: null,
          queue: { permission: "hr:leaves:approve", label: "HR approvals queue", memberCount: 3, members: [] },
          explanation: "Routed to the HR approvals queue (3 approvers) because reporting manager: no reporting manager is on record.",
        })}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText("HR approvals queue")).toBeInTheDocument();
    expect(screen.getByText("3 approvers")).toBeInTheDocument();
  });

  it("warns, rather than reading as empty, when nobody can own the request", () => {
    render(
      <ApprovalRoutePanel
        route={route({ rung: null, assignedTo: null, approver: null, escalation: null, explanation: "Nobody can approve this leave request." })}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText(/Nobody can approve this leave request\. Ask an HR administrator/)).toBeInTheDocument();
  });

  it("shows the backend's message when the route could not be loaded", () => {
    render(
      <ApprovalRoutePanel
        route={undefined}
        isLoading={false}
        error={new ApiError("No employment record is on file for you yet.", 409, "NO_EMPLOYMENT")}
      />,
    );

    expect(
      screen.getByText(/Couldn't work out who approves this request\. No employment record is on file for you yet\./),
    ).toBeInTheDocument();
  });
});
