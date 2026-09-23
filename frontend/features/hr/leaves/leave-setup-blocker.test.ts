import { leaveSetupBlocker } from "./leave-setup-blocker";
import type { Approver, LeaveType } from "./components/leaves-shared";

const TYPE = { id: 1, name: "Casual Leave" } as unknown as LeaveType;
const APPROVER = { id: "u1", email: "owner@example.test" } as unknown as Approver;

describe("a blocked leave request names the step that is actually missing, because the sheet labelled every blocker \"No approver available\"", () => {
  it("names the missing leave types rather than blaming the approver", () => {
    const blocker = leaveSetupBlocker([], [APPROVER]);

    expect(blocker?.submitLabel).toBe("Leave types not set up");
    expect(blocker?.href).toBe("/hr/leaves?tab=types");
  });

  it("names the missing approver once leave types exist", () => {
    const blocker = leaveSetupBlocker([TYPE], []);

    expect(blocker?.submitLabel).toBe("No approver assigned");
    expect(blocker?.href).toBe("/hr/org-chart");
  });

  it("reports leave types first, because an approver cannot help without one", () => {
    expect(leaveSetupBlocker([], [])?.submitLabel).toBe("Leave types not set up");
  });

  it("does not block a tenant that has both", () => {
    expect(leaveSetupBlocker([TYPE], [APPROVER])).toBeNull();
  });

  it("always offers a next action when it blocks", () => {
    for (const blocker of [
      leaveSetupBlocker([], []),
      leaveSetupBlocker([TYPE], []),
    ]) {
      expect(blocker?.actionLabel.length).toBeGreaterThan(0);
      expect(blocker?.description.length).toBeGreaterThan(0);
    }
  });
});
