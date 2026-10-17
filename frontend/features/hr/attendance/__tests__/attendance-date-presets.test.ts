import {
  attendanceDatePresets,
  istMonthRange,
  istWeekRange,
  payCycleRange,
} from "@/features/hr/attendance/attendance-date-presets";
import { attendancePayrollHint } from "@/features/hr/attendance/attendance-payroll-hint";
import {
  buildWeekStrip,
  presenceFor,
} from "@/features/hr/attendance/attendance-week";
import { classifyPunchFailure } from "@/features/hr/attendance/punch-failure";

const NOW = new Date("2026-10-14T08:00:00.000Z");

describe("attendanceDatePresets", () => {
  it("omits the Pay cycle preset entirely when no cycle is configured", () => {
    const ids = attendanceDatePresets(null, NOW).map((preset) => preset.id);
    expect(ids).toEqual(["today", "week", "month", "custom"]);
    expect(ids).not.toContain("payCycle");
  });

  it("offers Pay cycle only once a real cutoff date exists", () => {
    const presets = attendanceDatePresets(
      { title: "Payroll cutoff", date: "2026-10-25" },
      NOW,
    );
    const payCycle = presets.find((preset) => preset.id === "payCycle");
    expect(payCycle?.range).toEqual({ from: "2026-10-01", to: "2026-10-25" });
  });

  it("refuses a cutoff that is not a date", () => {
    expect(payCycleRange({ title: "Payroll cutoff", date: "soon" })).toBeNull();
    expect(payCycleRange(null)).toBeNull();
  });

  it("builds IST week and month windows", () => {
    expect(istWeekRange(NOW)).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    expect(istMonthRange(NOW)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });
});

describe("attendancePayrollHint", () => {
  it("stays silent without a real cutoff", () => {
    expect(attendancePayrollHint(null, null)).toBeNull();
    expect(attendancePayrollHint(3, null)).toBeNull();
  });

  it("stays silent while the cutoff is far away", () => {
    expect(attendancePayrollHint(9, "Payroll cutoff · 25 Oct · D-9")).toBeNull();
  });

  it("is qualitative and names no money when the cutoff is near", () => {
    const hint = attendancePayrollHint(2, "Payroll cutoff · 16 Oct · D-2");
    expect(hint).toMatch(/^Hint/);
    expect(hint).toMatch(/may affect LOP/);
    expect(hint).not.toMatch(/[₹$]/);
  });
});

describe("buildWeekStrip", () => {
  it("never claims presence for a day with no record or a future day", () => {
    const week = buildWeekStrip(
      [{ date: "2026-10-12", checkIn: "2026-10-12T03:30:00Z", checkOut: null, status: "PRESENT" }],
      NOW,
    );

    expect(week).toHaveLength(7);
    expect(week[0]).toMatchObject({ dayKey: "2026-10-12", presence: "in" });
    expect(week[1].presence).toBe("unknown");
    expect(week[6]).toMatchObject({ dayKey: "2026-10-18", presence: "unknown" });
    expect(week.find((day) => day.isToday)?.dayKey).toBe("2026-10-14");
  });

  it("reads WFH and leave days as themselves", () => {
    expect(presenceFor({ date: "x", checkIn: null, checkOut: null, status: "WFH" })).toBe("wfh");
    expect(presenceFor({ date: "x", checkIn: null, checkOut: null, status: "ON_LEAVE" })).toBe("leave");
    expect(presenceFor(undefined)).toBe("unknown");
  });
});

describe("classifyPunchFailure", () => {
  it("recognises a location refusal so the WFH way out can be offered", () => {
    expect(classifyPunchFailure("You are outside the geofence")).toBe("geofence");
    expect(classifyPunchFailure("Location is required")).toBe("geofence");
  });

  it("does not invent a location cause", () => {
    expect(classifyPunchFailure("Shift not assigned")).toBe("other");
    expect(classifyPunchFailure(null)).toBe("other");
  });
});
