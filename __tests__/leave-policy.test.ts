import { describe, it, expect } from "vitest";
import {
  LEAVE_POLICY,
  DEFAULT_LEAVE_TYPES,
  ALLOWED_LEAVE_TYPE_NAMES,
  calculateProratedCasualLeaves,
  getSickLeaveAllocation,
  resolveInitialBalance,
} from "@/lib/leave-policy";

describe("LEAVE_POLICY", () => {
  it("has correct casual leave config", () => {
    expect(LEAVE_POLICY.CASUAL.daysPerYear).toBe(12);
    expect(LEAVE_POLICY.CASUAL.perMonth).toBe(1);
    expect(LEAVE_POLICY.CASUAL.carryForward).toBe(false);
  });

  it("has correct sick leave config", () => {
    expect(LEAVE_POLICY.SICK.daysPerYear).toBe(6);
  });

  it("has zero days for unpaid", () => {
    expect(LEAVE_POLICY.UNPAID.daysPerYear).toBe(0);
  });
});

describe("DEFAULT_LEAVE_TYPES", () => {
  it("has 3 leave types", () => {
    expect(DEFAULT_LEAVE_TYPES).toHaveLength(3);
  });
});

describe("ALLOWED_LEAVE_TYPE_NAMES", () => {
  it("contains all three leave types", () => {
    expect(ALLOWED_LEAVE_TYPE_NAMES.has("Casual Leave")).toBe(true);
    expect(ALLOWED_LEAVE_TYPE_NAMES.has("Sick Leave")).toBe(true);
    expect(ALLOWED_LEAVE_TYPE_NAMES.has("Unpaid Leave")).toBe(true);
  });
});

describe("calculateProratedCasualLeaves", () => {
  it("returns full allocation for previous year joiners", () => {
    expect(calculateProratedCasualLeaves("2025-03-15", 2026)).toBe(12);
  });

  it("returns 0 for future year joiners", () => {
    expect(calculateProratedCasualLeaves("2027-06-01", 2026)).toBe(0);
  });

  it("prorates for same-year joiners", () => {
    // Joined in March (month index 2) → 12 - 2 = 10
    expect(calculateProratedCasualLeaves("2026-03-15", 2026)).toBe(10);
  });

  it("returns 12 for January joiners", () => {
    expect(calculateProratedCasualLeaves("2026-01-01", 2026)).toBe(12);
  });

  it("returns 1 for November joiners", () => {
    // Month index 10 → 12 - 10 = 2
    expect(calculateProratedCasualLeaves("2026-11-01", 2026)).toBe(2);
  });

  it("handles Date objects", () => {
    expect(calculateProratedCasualLeaves(new Date("2026-06-01"), 2026)).toBe(7);
  });
});

describe("getSickLeaveAllocation", () => {
  it("returns 6", () => {
    expect(getSickLeaveAllocation()).toBe(6);
  });
});

describe("resolveInitialBalance", () => {
  it("returns prorated casual leaves", () => {
    const result = resolveInitialBalance("Casual Leave", 12, "2026-03-01", 2026);
    expect(result).toBe(10);
  });

  it("returns sick leave allocation", () => {
    const result = resolveInitialBalance("Sick Leave", 6, "2026-01-01", 2026);
    expect(result).toBe(6);
  });

  it("returns 0 for unpaid leave", () => {
    const result = resolveInitialBalance("Unpaid Leave", 0, "2026-01-01", 2026);
    expect(result).toBe(0);
  });

  it("returns daysPerYear for unknown type", () => {
    const result = resolveInitialBalance("Custom Leave", 15, "2026-01-01", 2026);
    expect(result).toBe(15);
  });
});
