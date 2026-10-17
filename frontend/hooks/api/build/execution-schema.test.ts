import { ZodError } from "zod";

import {
  memberCapacityItemSchema,
  workloadCapacityContract,
} from "./execution-schema";

const FULL_ROW = {
  userId: "user-1",
  membershipId: 11,
  teams: [] as Array<{ id: number; name: string }>,
  workingDaysInWindow: 5,
  leaveDays: 0,
  halfLeaveDays: 0,
  netCapacityDays: 5,
  capacityHours: 40,
  loggedHours: 12,
  estimateHours: 20,
  allocationPercent: 50,
  varianceHours: -8,
  isOverAllocated: false,
  isZeroCapacity: false,
  utilizationPercent: 30,
};

function rowWithout(key: keyof typeof FULL_ROW): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...FULL_ROW };
  delete clone[key];
  return clone;
}

describe("memberCapacityItemSchema — the three core figures the workload row renders", () => {
  it("accepts a row carrying estimateHours, allocationPercent and varianceHours and keeps all three values", () => {
    const parsed = memberCapacityItemSchema.parse(FULL_ROW);

    expect(parsed.estimateHours).toBe(20);
    expect(parsed.allocationPercent).toBe(50);
    expect(parsed.varianceHours).toBe(-8);
  });

  it("accepts null for all three figures, because a member with no estimated open work has no allocation or variance to report", () => {
    const parsed = memberCapacityItemSchema.parse({
      ...FULL_ROW,
      estimateHours: null,
      allocationPercent: null,
      varianceHours: null,
    });

    expect(parsed.estimateHours).toBeNull();
    expect(parsed.allocationPercent).toBeNull();
    expect(parsed.varianceHours).toBeNull();
  });
});

describe("memberCapacityItemSchema — a dropped projection throws at the decode boundary instead of rendering blank forever", () => {
  it("throws when estimateHours is absent, so a backend that stops projecting it fails loudly", () => {
    expect(() => memberCapacityItemSchema.parse(rowWithout("estimateHours"))).toThrow(ZodError);
  });

  it("throws when allocationPercent is absent, so a backend that stops projecting it fails loudly", () => {
    expect(() => memberCapacityItemSchema.parse(rowWithout("allocationPercent"))).toThrow(ZodError);
  });

  it("throws when varianceHours is absent, so a backend that stops projecting it fails loudly", () => {
    expect(() => memberCapacityItemSchema.parse(rowWithout("varianceHours"))).toThrow(ZodError);
  });

  it("throws when loggedHours is absent, confirming the absence test above is not passing vacuously", () => {
    expect(() => memberCapacityItemSchema.parse(rowWithout("loggedHours"))).toThrow(ZodError);
  });

  it("rejects a string where estimateHours should be a number, so a numeric column arriving unparsed is caught", () => {
    expect(() =>
      memberCapacityItemSchema.parse({ ...FULL_ROW, estimateHours: "20.00" }),
    ).toThrow(ZodError);
  });
});

describe("workloadCapacityContract — the whole capacity envelope", () => {
  it("decodes a members array carrying the three figures", () => {
    const parsed = workloadCapacityContract.parse({ members: [FULL_ROW] });

    expect(parsed.members).toHaveLength(1);
    expect(parsed.members[0].allocationPercent).toBe(50);
  });

  it("throws when one member in the array is missing estimateHours, so a partially dropped projection cannot slip through", () => {
    expect(() =>
      workloadCapacityContract.parse({ members: [FULL_ROW, rowWithout("estimateHours")] }),
    ).toThrow(ZodError);
  });
});
