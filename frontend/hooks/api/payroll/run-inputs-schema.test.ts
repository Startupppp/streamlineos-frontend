import { inputsListContract } from "./run-inputs-schema";

const row = {
  id: 1,
  userId: "u-1",
  source: "ATTENDANCE",
  scheduledDays: "26",
  paidDays: "26",
  lopDays: "0",
  halfDays: "0",
  overtimeHours: "0",
  shiftAllowanceUnits: "0",
  holidayWorkDays: "0",
  billableHours: "0",
  isOverride: false,
  overrideReason: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  userName: "Asha",
  userEmail: "asha@example.com",
};

describe("PAY-B-019 the run inputs contract matches the backend cursor page", () => {
  it("accepts the { data, pagination } page the inputs endpoint returns", () => {
    const page = { data: [row], pagination: { limit: 50, hasMore: false, nextCursor: null } };
    expect(inputsListContract.parse(page)).toEqual(page);
  });

  it("rejects a bare array, which the endpoint never sends", () => {
    expect(inputsListContract.safeParse([row]).success).toBe(false);
  });
});
