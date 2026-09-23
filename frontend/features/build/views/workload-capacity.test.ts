import { isMemberOverCapacity, type MemberCapacityData } from "./workload-types";

const OVER: MemberCapacityData = {
  capacityHours: 40,
  loggedHours: 45,
  isOverAllocated: true,
  isZeroCapacity: false,
  utilizationPercent: 112.5,
};

const UNDER: MemberCapacityData = {
  capacityHours: 40,
  loggedHours: 32,
  isOverAllocated: false,
  isZeroCapacity: false,
  utilizationPercent: 80,
};

const ZERO_CAP_LOGGED: MemberCapacityData = {
  capacityHours: 0,
  loggedHours: 2,
  isOverAllocated: true,
  isZeroCapacity: true,
  utilizationPercent: null,
};

const ZERO_CAP_EMPTY: MemberCapacityData = {
  capacityHours: 0,
  loggedHours: 0,
  isOverAllocated: false,
  isZeroCapacity: true,
  utilizationPercent: null,
};

const NULL_HOURS: MemberCapacityData = {
  capacityHours: null,
  loggedHours: 99,
  isOverAllocated: false,
  isZeroCapacity: false,
  utilizationPercent: null,
};

describe("isMemberOverCapacity — ticket-count fallback (no capacityData)", () => {
  it("returns false when ticket count is exactly 5", () => {
    expect(isMemberOverCapacity(5, undefined)).toBe(false);
  });

  it("returns true when ticket count is 6", () => {
    expect(isMemberOverCapacity(6, undefined)).toBe(true);
  });

  it("returns false when ticket count is 0", () => {
    expect(isMemberOverCapacity(0, undefined)).toBe(false);
  });

  it("returns true when ticket count is much greater than 5", () => {
    expect(isMemberOverCapacity(20, undefined)).toBe(true);
  });

  it("returns false when ticket count is 4", () => {
    expect(isMemberOverCapacity(4, undefined)).toBe(false);
  });
});

describe("isMemberOverCapacity — real capacity data takes precedence over ticket count", () => {
  it("returns true when capacityData.isOverAllocated is true regardless of ticket count", () => {
    expect(isMemberOverCapacity(2, OVER)).toBe(true);
  });

  it("returns false when capacityData.isOverAllocated is false even with many tickets", () => {
    expect(isMemberOverCapacity(10, UNDER)).toBe(false);
  });

  it("returns true when member has zero capacity and logged hours", () => {
    expect(isMemberOverCapacity(0, ZERO_CAP_LOGGED)).toBe(true);
  });

  it("returns false when member has zero capacity and no logged hours", () => {
    expect(isMemberOverCapacity(0, ZERO_CAP_EMPTY)).toBe(false);
  });

  it("returns false when capacityHours is null (ticket-count mode deferred to capacityData)", () => {
    expect(isMemberOverCapacity(0, NULL_HOURS)).toBe(false);
  });

  it("ticket count of 3 is not over capacity when real hours data says under", () => {
    expect(isMemberOverCapacity(3, UNDER)).toBe(false);
  });
});

describe("isMemberOverCapacity — ticket count boundary does not override real capacity flag", () => {
  it("a member with 4 tickets but over-allocated by hours is over capacity", () => {
    const slightlyOver: MemberCapacityData = { ...UNDER, loggedHours: 41, isOverAllocated: true };
    expect(isMemberOverCapacity(4, slightlyOver)).toBe(true);
  });

  it("a member with 6 tickets but under hours capacity is not over capacity", () => {
    const highTicketUnderHours: MemberCapacityData = { ...UNDER, isOverAllocated: false };
    expect(isMemberOverCapacity(6, highTicketUnderHours)).toBe(false);
  });
});
