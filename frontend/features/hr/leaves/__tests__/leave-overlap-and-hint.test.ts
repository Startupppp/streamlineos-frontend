import {
  findLeaveOverlap,
  leaveOverlapMessage,
  type LeaveSpan,
} from "@/features/hr/leaves/leave-overlap";
import { leaveLopHint, LOP_HINT_PREFIX } from "@/features/hr/leaves/leave-lop-hint";

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
    typeName: "Casual Leave",
    entitledDaysPerYear: 12,
    balanceKnown: true,
    availableDays: 3,
    requestedDays: 2,
  };

  it("stays silent while the request fits the known balance", () => {
    expect(leaveLopHint(base)).toBeNull();
  });

  it("is labelled a hint, is qualitative, and carries no currency figure", () => {
    const hint = leaveLopHint({ ...base, requestedDays: 5 });
    expect(hint).not.toBeNull();
    expect(hint!.startsWith(LOP_HINT_PREFIX)).toBe(true);
    expect(hint).toMatch(/may affect LOP/);
    expect(hint).not.toMatch(/[₹$]|\bINR\b|\brupee/i);
    expect(hint).not.toMatch(/proven|calculated|exact/i);
  });

  it("flags a type with no paid entitlement configured", () => {
    const hint = leaveLopHint({ ...base, entitledDaysPerYear: 0 });
    expect(hint).toMatch(/no paid entitlement/);
  });

  it("never guesses when the balance is unknown", () => {
    expect(
      leaveLopHint({ ...base, balanceKnown: false, availableDays: null, requestedDays: 99 }),
    ).toBeNull();
  });

  it("says nothing before dates are picked", () => {
    expect(leaveLopHint({ ...base, requestedDays: 0 })).toBeNull();
  });
});
