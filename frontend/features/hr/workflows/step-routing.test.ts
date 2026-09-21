import { currentStepRouting } from "./step-routing";

describe("an inbox row explains why its approver holds the request", () => {
  it("reads the routing the engine persisted for the current step", () => {
    const routing = currentStepRouting({
      currentStepOrder: 2,
      context: {
        approvalRouting: {
          "1": { rung: "reporting_manager", explanation: "First step", dueAt: "2026-09-22T00:00:00.000Z", approverUserIds: [] },
          "2": {
            rung: "managers_manager",
            explanation: "Priya Nair is the reporting manager's manager.",
            escalationRung: "department_head",
            delegation: { fromUserId: "usr_a", toUserId: "usr_b", endsAt: "2026-09-30T00:00:00.000Z" },
            dueAt: "2026-09-23T00:00:00.000Z",
            approverUserIds: ["usr_b"],
          },
        },
      },
    });
    expect(routing).toEqual({
      rungLabel: "Manager's manager",
      explanation: "Priya Nair is the reporting manager's manager.",
      escalationLabel: "department head",
      delegatedFromUserId: "usr_a",
    });
  });

  it("answers nothing for a step the engine routed before routing was persisted", () => {
    expect(currentStepRouting({ currentStepOrder: 1, context: {} })).toBeNull();
    expect(currentStepRouting({ currentStepOrder: 1, context: { approvalRouting: { "1": { rung: "queue" } } } })).toBeNull();
  });
});
