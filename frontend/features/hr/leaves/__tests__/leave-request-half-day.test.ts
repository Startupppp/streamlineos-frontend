import { effectiveLeaveEnd, leaveFormSchema } from "../leave-request-schema";

const BASE = {
  leaveTypeId: "1",
  startDate: "2026-10-14",
  endDate: "",
  halfDayPeriod: "AM" as const,
  priority: "MEDIUM" as const,
  reason: "Doctor appointment in the morning",
};

describe("half-day leave needs no End date (QA 2026-10-13)", () => {
  it("accepts a half-day request with the End date left empty, and ends it on the start date", () => {
    const parsed = leaveFormSchema.safeParse({ ...BASE, halfDay: true });
    expect(parsed.success).toBe(true);
    expect(effectiveLeaveEnd({ ...BASE, halfDay: true })).toBe("2026-10-14");
  });

  it("still requires an End date for a full-day request", () => {
    const parsed = leaveFormSchema.safeParse({ ...BASE, halfDay: false });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.message)).toContain("End date is required");
  });
});
