import { activeAttendancePollInterval } from "@/lib/query-request-policies";

describe("activeAttendancePollInterval", () => {
  it("polls while a session is active", () => {
    expect(
      activeAttendancePollInterval({ todayLog: { checkIn: "2026-07-24T09:00:00Z", checkOut: null } }),
    ).toBe(60000);
  });

  it("stops polling after checkout", () => {
    expect(
      activeAttendancePollInterval({
        todayLog: { checkIn: "2026-07-24T09:00:00Z", checkOut: "2026-07-24T18:00:00Z" },
      }),
    ).toBe(false);
  });

  it("does not poll before check-in", () => {
    expect(activeAttendancePollInterval({ todayLog: { checkIn: null, checkOut: null } })).toBe(false);
    expect(activeAttendancePollInterval({ todayLog: null })).toBe(false);
    expect(activeAttendancePollInterval(undefined)).toBe(false);
  });
});
