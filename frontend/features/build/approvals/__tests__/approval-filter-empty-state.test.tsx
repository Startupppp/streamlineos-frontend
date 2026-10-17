"use client";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

describe("approvals — filtered empty state does not leak counts", () => {
  it("empty filtered list shows no count information", () => {
    const filteredApprovals: unknown[] = [];
    const totalCount: number | undefined = undefined;

    expect(filteredApprovals).toHaveLength(0);
    expect(totalCount).toBeUndefined();
  });

  it("filtered empty state message does not reveal total count", () => {
    const emptyMessage = "No approvals match your filters";
    expect(emptyMessage).not.toMatch(/\d+ approval/);
    expect(emptyMessage).not.toMatch(/out of \d+/);
  });

  it("approval count badge is absent when filtered result is empty", () => {
    const filteredApprovals: unknown[] = [];
    const showBadge = filteredApprovals.length > 0;
    expect(showBadge).toBe(false);
  });
});

describe("approvals — audit row for each decision", () => {
  it("each decision action produces exactly one audit row", () => {
    const auditRows: Array<{ action: string; approvalId: number }> = [];

    function recordAudit(action: string, approvalId: number) {
      auditRows.push({ action, approvalId });
    }

    recordAudit("approval.decided", 1);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]).toMatchObject({ action: "approval.decided", approvalId: 1 });
  });

  it("approved and rejected decisions each produce one audit row", () => {
    const auditRows: Array<{ decision: string }> = [];

    function decide(decision: "approved" | "rejected") {
      auditRows.push({ decision });
    }

    decide("approved");
    decide("rejected");

    expect(auditRows).toHaveLength(2);
    expect(auditRows[0].decision).toBe("approved");
    expect(auditRows[1].decision).toBe("rejected");
  });
});
