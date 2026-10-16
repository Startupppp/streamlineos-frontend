import {
  findLeaveOverlap,
  leaveOverlapMessage,
  type LeaveSpan,
} from "@/features/hr/leaves/leave-overlap";
import { leaveBalanceError, leaveLopHint, LOP_HINT_PREFIX } from "@/features/hr/leaves/leave-lop-hint";

const APPROVED: LeaveSpan = {
  id: 7,
  status: "APPROVED",
  startDate: "2026-10-05",
  endDate: "2026-10-07",
  leaveType: { name: "Casual Leave" },
};

describe("findLeaveOverlap", () => {
  it("blocks a request that touches an approved span", () => {
    expect(findLeaveOverlap([APPROVED], "2026-10-07", "2026-10-09")?.id).toBe(7);
    expect(findLeaveOverlap([APPROVED], "2026-10-01", "2026-10-05")?.id).toBe(7);
    expect(findLeaveOverlap([APPROVED], "2026-10-06", "2026-10-06")?.id).toBe(7);
  });

  it("allows a request that clears the approved span", () => {
    expect(findLeaveOverlap([APPROVED], "2026-10-08", "2026-10-09")).toBeNull();
    expect(findLeaveOverlap([APPROVED], "2026-10-01", "2026-10-04")).toBeNull();
  });

  it("only approved leave blocks", () => {
    const pending: LeaveSpan = { ...APPROVED, status: "PENDING" };
    const rejected: LeaveSpan = { ...APPROVED, status: "REJECTED" };
    expect(findLeaveOverlap([pending, rejected], "2026-10-06", "2026-10-06")).toBeNull();
  });

  it("names the conflict in the message without inventing a type", () => {
    const named = leaveOverlapMessage(findLeaveOverlap([APPROVED], "2026-10-06", "2026-10-06")!);
    expect(named).toContain("Casual Leave");

    const untyped = leaveOverlapMessage({
      id: 1,
      startDate: "2026-10-06",
      endDate: "2026-10-06",
      typeName: null,
    });
    expect(untyped).toContain("approved leave");
  });
});

describe("leaveLopHint", () => {
  const base = {
    typeName: "Unpaid Leave",
    entitledDaysPerYear: 0,
    requestedDays: 2,
  };

  it("is labelled a hint, is qualitative, and carries no currency figure", () => {
    const hint = leaveLopHint(base);
    expect(hint).not.toBeNull();
    expect(hint!.startsWith(LOP_HINT_PREFIX)).toBe(true);
    expect(hint).toMatch(/no paid entitlement/);
    expect(hint).not.toMatch(/[₹$]|\bINR\b|\brupee/i);
    expect(hint).not.toMatch(/proven|calculated|exact/i);
  });

  it("stays silent for a paid type, because the server refuses an over-balance request", () => {
    expect(leaveLopHint({ ...base, entitledDaysPerYear: 12, requestedDays: 99 })).toBeNull();
  });

  it("says nothing before dates are picked", () => {
    expect(leaveLopHint({ ...base, requestedDays: 0 })).toBeNull();
  });
});

describe("leaveBalanceError", () => {
  const base = {
    typeName: "Casual Leave",
    entitledDaysPerYear: 12,
    availableDays: 11,
    requestedDays: 12,
  };

  it("names the requested and available days when a paid request exceeds the balance", () => {
    expect(leaveBalanceError(base)).toMatch(/Requested 12 days exceeds your available 11 days of Casual Leave/);
  });

  it("allows a request that fits the balance", () => {
    expect(leaveBalanceError({ ...base, requestedDays: 11 })).toBeNull();
  });

  it("never blocks an unpaid type or an unknown balance", () => {
    expect(leaveBalanceError({ ...base, entitledDaysPerYear: 0 })).toBeNull();
    expect(leaveBalanceError({ ...base, availableDays: null })).toBeNull();
  });
});
