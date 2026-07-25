import { attendancePollInterval } from "../attendance-utils";

describe("attendancePollInterval", () => {
  it("polls while a session is active", () => {
    expect(
      attendancePollInterval({ todayLog: { checkIn: "2026-07-24T09:00:00Z", checkOut: null } }),
    ).toBe(60000);
  });

  it("stops polling after checkout", () => {
    expect(
      attendancePollInterval({
        todayLog: { checkIn: "2026-07-24T09:00:00Z", checkOut: "2026-07-24T18:00:00Z" },
      }),
    ).toBe(false);
  });

  it("does not poll before check-in", () => {
    expect(attendancePollInterval({ todayLog: { checkIn: null, checkOut: null } })).toBe(false);
    expect(attendancePollInterval({ todayLog: null })).toBe(false);
    expect(attendancePollInterval(undefined)).toBe(false);
  });
});
