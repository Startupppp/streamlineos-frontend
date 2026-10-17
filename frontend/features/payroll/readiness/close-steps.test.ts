import { currentStepKey, deriveCloseSteps, type CloseStepKey } from "./close-steps";

function current(runStatus: string | null, openBlockers = 0): CloseStepKey | null {
  return currentStepKey(deriveCloseSteps({ runStatus, openBlockers }));
}

describe("deriveCloseSteps", () => {
  it.each<[string | null, number, CloseStepKey | null]>([
    [null, 0, "open"],
    [null, 3, "open"],
    ["PREPARING", 0, "process"],
    ["DRAFT", 0, "process"],
    ["REOPENED", 0, "process"],
    ["PREPARING", 2, "checklist"],
    ["DRAFT", 1, "checklist"],
    ["EXCEPTIONS_FOUND", 1, "checklist"],
    ["EXCEPTIONS_FOUND", 0, "approve"],
    ["PREVIEW_READY", 0, "approve"],
    ["PENDING_APPROVAL", 0, "approve"],
    ["APPROVED", 0, "approve"],
    ["LOCKED", 0, "pay"],
    ["PAID", 0, "release"],
    ["PAYSLIPS_PUBLISHED", 0, null],
    ["CLOSED", 0, null],
    ["SOMETHING_NEW", 0, "process"],
  ])("status %s with %i blockers puts %s current", (status, blockers, expected) => {
    expect(current(status, blockers)).toBe(expected);
  });

  it("marks every step before the current one done and every step after it locked", () => {
    const steps = deriveCloseSteps({ runStatus: "LOCKED", openBlockers: 0 });
    expect(steps.map((step) => step.state)).toEqual(["done", "done", "done", "done", "done", "current", "locked"]);
    expect(steps[6]!.lockedReason).toBe("Pay the run first");
  });

  it("names the blocker count as the reason Process is locked once a run exists", () => {
    const steps = deriveCloseSteps({ runStatus: "DRAFT", openBlockers: 2 });
    const process = steps.find((step) => step.key === "process")!;
    expect(process.state).toBe("locked");
    expect(process.lockedReason).toBe("Clear 2 open blockers first");
  });

  it("asks for the run before anything else when none exists, even with blockers", () => {
    const steps = deriveCloseSteps({ runStatus: null, openBlockers: 1 });
    expect(steps.find((step) => step.key === "process")!.lockedReason).toBe("Create this month's run first");
    expect(steps.filter((step) => step.state === "current")).toHaveLength(1);
  });

  it("leaves every step done once payslips are published", () => {
    const steps = deriveCloseSteps({ runStatus: "PAYSLIPS_PUBLISHED", openBlockers: 0 });
    expect(steps.every((step) => step.state === "done" && step.lockedReason === null)).toBe(true);
  });
});
