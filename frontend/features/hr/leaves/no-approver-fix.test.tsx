import { render, screen } from "@testing-library/react";
import { ApprovalRoutePanel, summarizeApprovalRoute } from "@/components/shared/approval-route-panel";
import type { ApprovalRoute } from "@/hooks/api/hr/approval-route-schema";
import { noApproverFix } from "./no-approver-fix";

/**
 * HRMS-E2E-032. With nobody to approve, the leave button read "No approver
 * available" and the panel said to ask an HR administrator — including when the
 * person reading it WAS that administrator. §10.7 wants the why and a way out:
 * the resolver's skip reasons say which screen fixes it, and the viewer's
 * permissions say whether to offer it.
 */

type SkipReason = ApprovalRoute["skipped"][number]["reason"];

function unrouted(...reasons: SkipReason[]): ApprovalRoute {
  return {
    kind: "leave",
    subjectUserId: "owner-1",
    permission: "hr:leaves:approve",
    resolvedAt: "2026-09-25T00:00:00.000Z",
    rung: null,
    assignedTo: null,
    approver: null,
    delegation: null,
    queue: null,
    skipped: reasons.map((reason) => ({ rung: "reporting_manager", userId: null, reason })),
    slaHours: 0,
    dueAt: "2026-09-25T00:00:00.000Z",
    escalation: null,
    explanation: "Nobody can approve this request.",
  };
}

const admin = { canSetManagers: true, canAssignApprovers: true };
const member = { canSetManagers: false, canAssignApprovers: false };

describe("noApproverFix", () => {
  it("sends an admin to set a reporting manager when the manager rung is what failed", () => {
    expect(noApproverFix(unrouted("no-manager", "queue-empty"), admin)?.href).toBe(
      "/hr/employees/manager-coverage",
    );
    expect(noApproverFix(unrouted("manager-exited"), admin)?.href).toBe("/hr/employees/manager-coverage");
  });

  it("sends an admin to HR access when only the approver queue failed", () => {
    expect(noApproverFix(unrouted("self", "queue-empty"), admin)?.href).toBe("/hr/access");
    expect(noApproverFix(unrouted("lacks-permission"), admin)?.href).toBe("/hr/access");
  });

  it("falls through to the queue when the viewer cannot edit managers but can assign approvers", () => {
    const fix = noApproverFix(unrouted("no-manager", "queue-empty"), {
      canSetManagers: false,
      canAssignApprovers: true,
    });
    expect(fix?.href).toBe("/hr/access");
  });

  it("offers nothing to a viewer who can fix neither", () => {
    expect(noApproverFix(unrouted("no-manager", "queue-empty"), member)).toBeNull();
  });

  it("offers nothing when the route has an approver", () => {
    expect(noApproverFix({ ...unrouted(), rung: "queue" }, admin)).toBeNull();
  });
});

describe("ApprovalRoutePanel with a way out", () => {
  it("links to the fix instead of telling an admin to ask an admin", () => {
    const route = unrouted("no-manager");
    render(
      <ApprovalRoutePanel
        route={summarizeApprovalRoute(route)}
        isLoading={false}
        error={null}
        unownedAction={noApproverFix(route, admin)}
      />,
    );

    expect(screen.getByText(/Nobody can approve this request/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Set a reporting manager" })).toHaveAttribute(
      "href",
      "/hr/employees/manager-coverage",
    );
    expect(screen.queryByText(/Ask an HR administrator/)).not.toBeInTheDocument();
  });

  it("keeps the ask-an-admin hint and renders no link for a member", () => {
    const route = unrouted("no-manager");
    render(
      <ApprovalRoutePanel
        route={summarizeApprovalRoute(route)}
        isLoading={false}
        error={null}
        unownedAction={noApproverFix(route, member)}
      />,
    );

    expect(screen.getByText(/Ask an HR administrator/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
