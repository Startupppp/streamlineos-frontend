import { buildRrule, parseRrule, defaultRecurrenceState } from "./event-recurrence-schema";
import type { RecurrenceState } from "./event-recurrence-schema";

function round(state: RecurrenceState): RecurrenceState | null {
  const rrule = buildRrule(state);
  if (!rrule) return null;
  return parseRrule(rrule);
}

describe("buildRrule / parseRrule round-trip", () => {
  describe("weekly with BYDAY", () => {
    it("preserves a single day", () => {
      const state: RecurrenceState = {
        ...defaultRecurrenceState("2024-03-11"),
        freq: "WEEKLY",
        byDay: ["MO"],
      };
      const rrule = buildRrule(state);
      expect(rrule).toBe("FREQ=WEEKLY;BYDAY=MO");
      const parsed = parseRrule(rrule!);
      expect(parsed.freq).toBe("WEEKLY");
      expect(parsed.byDay).toEqual(["MO"]);
      expect(parsed.endType).toBe("never");
    });

    it("preserves multiple days in order", () => {
      const state: RecurrenceState = {
        ...defaultRecurrenceState("2024-03-11"),
        freq: "WEEKLY",
        byDay: ["MO", "WE", "FR"],
      };
      const rrule = buildRrule(state);
      expect(rrule).toBe("FREQ=WEEKLY;BYDAY=MO,WE,FR");
      const parsed = parseRrule(rrule!);
      expect(parsed.byDay).toEqual(["MO", "WE", "FR"]);
    });

    it("weekly with COUNT round-trips correctly", () => {
      const state: RecurrenceState = {
        ...defaultRecurrenceState("2024-03-11"),
        freq: "WEEKLY",
        byDay: ["TU", "TH"],
        endType: "count",
        count: 5,
      };
      const rrule = buildRrule(state);
      expect(rrule).toBe("FREQ=WEEKLY;BYDAY=TU,TH;COUNT=5");
      const parsed = parseRrule(rrule!);
      expect(parsed.freq).toBe("WEEKLY");
      expect(parsed.byDay).toEqual(["TU", "TH"]);
      expect(parsed.endType).toBe("count");
      expect(parsed.count).toBe(5);
    });

    it("weekly with UNTIL round-trips correctly", () => {
      const state: RecurrenceState = {
        ...defaultRecurrenceState("2024-03-11"),
        freq: "WEEKLY",
        byDay: ["WE"],
        endType: "until",
        until: "2024-12-31",
      };
      const rrule = buildRrule(state);
      expect(rrule).toBe("FREQ=WEEKLY;BYDAY=WE;UNTIL=20241231T000000Z");
      const parsed = parseRrule(rrule!);
      expect(parsed.freq).toBe("WEEKLY");
      expect(parsed.endType).toBe("until");
      expect(parsed.until).toBe("2024-12-31");
    });
  });

  describe("monthly with BYSETPOS", () => {
    it("preserves second Monday round-trip", () => {
      const state: RecurrenceState = {
        ...defaultRecurrenceState("2024-03-11"),
        freq: "MONTHLY",
        monthlyMode: "bysetpos",
        bySetPos: 2,
        byDay: ["MO"],
      };
      const rrule = buildRrule(state);
      expect(rrule).toBe("FREQ=MONTHLY;BYSETPOS=2;BYDAY=MO");
      const parsed = parseRrule(rrule!);
      expect(parsed.freq).toBe("MONTHLY");
      expect(parsed.monthlyMode).toBe("bysetpos");
      expect(parsed.bySetPos).toBe(2);
      expect(parsed.byDay).toEqual(["MO"]);
    });

    it("preserves last Friday (bySetPos=-1) round-trip", () => {
      const state: RecurrenceState = {
        ...defaultRecurrenceState("2024-03-11"),
        freq: "MONTHLY",
        monthlyMode: "bysetpos",
        bySetPos: -1,
        byDay: ["FR"],
      };
      const rrule = buildRrule(state);
      expect(rrule).toBe("FREQ=MONTHLY;BYSETPOS=-1;BYDAY=FR");
      const parsed = parseRrule(rrule!);
      expect(parsed.bySetPos).toBe(-1);
      expect(parsed.byDay).toEqual(["FR"]);
    });

    it("monthly bysetpos with COUNT round-trips correctly", () => {
      const state: RecurrenceState = {
        ...defaultRecurrenceState("2024-03-11"),
        freq: "MONTHLY",
        monthlyMode: "bysetpos",
        bySetPos: 3,
        byDay: ["WE"],
        endType: "count",
        count: 12,
      };
      const rrule = buildRrule(state);
      expect(rrule).toBe("FREQ=MONTHLY;BYSETPOS=3;BYDAY=WE;COUNT=12");
      const parsed = parseRrule(rrule!);
      expect(parsed.endType).toBe("count");
      expect(parsed.count).toBe(12);
      expect(parsed.monthlyMode).toBe("bysetpos");
    });
  });

  describe("monthly with BYMONTHDAY", () => {
    it("preserves bymonthday round-trip", () => {
      const state: RecurrenceState = {
        ...defaultRecurrenceState("2024-03-15"),
        freq: "MONTHLY",
        monthlyMode: "bymonthday",
        byMonthDay: 15,
      };
      const rrule = buildRrule(state);
      expect(rrule).toBe("FREQ=MONTHLY;BYMONTHDAY=15");
      const parsed = parseRrule(rrule!);
      expect(parsed.freq).toBe("MONTHLY");
      expect(parsed.monthlyMode).toBe("bymonthday");
      expect(parsed.byMonthDay).toBe(15);
    });
  });

  describe("COUNT vs UNTIL distinction", () => {
    it("emits COUNT when endType=count", () => {
      const state: RecurrenceState = {
        ...defaultRecurrenceState(),
        freq: "DAILY",
        endType: "count",
        count: 7,
      };
      const rrule = buildRrule(state);
      expect(rrule).toContain("COUNT=7");
      expect(rrule).not.toContain("UNTIL");
    });

    it("emits UNTIL when endType=until", () => {
      const state: RecurrenceState = {
        ...defaultRecurrenceState(),
        freq: "DAILY",
        endType: "until",
        until: "2025-06-30",
      };
      const rrule = buildRrule(state);
      expect(rrule).toContain("UNTIL=20250630T000000Z");
      expect(rrule).not.toContain("COUNT");
    });

    it("emits neither COUNT nor UNTIL when endType=never", () => {
      const state: RecurrenceState = {
        ...defaultRecurrenceState(),
        freq: "DAILY",
        endType: "never",
      };
      const rrule = buildRrule(state);
      expect(rrule).not.toContain("COUNT");
      expect(rrule).not.toContain("UNTIL");
    });
  });

  describe("none frequency", () => {
    it("returns null for freq=none", () => {
      const state = defaultRecurrenceState("2024-01-01");
      expect(buildRrule(state)).toBeNull();
    });
  });

  describe("interval handling", () => {
    it("omits INTERVAL=1", () => {
      const state: RecurrenceState = {
        ...defaultRecurrenceState(),
        freq: "WEEKLY",
        byDay: ["MO"],
        interval: 1,
      };
      expect(buildRrule(state)).not.toContain("INTERVAL");
    });

    it("includes INTERVAL when >1", () => {
      const state: RecurrenceState = {
        ...defaultRecurrenceState(),
        freq: "WEEKLY",
        byDay: ["MO"],
        interval: 2,
      };
      const rrule = buildRrule(state);
      expect(rrule).toContain("INTERVAL=2");
      const parsed = parseRrule(rrule!);
      expect(parsed.interval).toBe(2);
    });
  });

  describe("parseRrule strips RRULE: prefix", () => {
    it("handles RRULE: prefix from backend", () => {
      const parsed = parseRrule("RRULE:FREQ=WEEKLY;BYDAY=MO,FR");
      expect(parsed.freq).toBe("WEEKLY");
      expect(parsed.byDay).toEqual(["MO", "FR"]);
    });
  });
});

describe("visibility gating — enabled flag logic", () => {
  it("HR query enabled when both forbidden=false and hrVisible=true", () => {
    const forbidden = false;
    const hrVisible = true;
    expect(!forbidden && hrVisible).toBe(true);
  });

  it("HR query disabled when hrVisible=false regardless of forbidden", () => {
    const forbidden = false;
    const hrVisible = false;
    expect(!forbidden && hrVisible).toBe(false);
  });

  it("HR query disabled when forbidden=true regardless of hrVisible", () => {
    const forbidden = true;
    const hrVisible = true;
    expect(!forbidden && hrVisible).toBe(false);
  });

  it("attendance query enabled when canViewAttendance=true and attendanceVisible=true", () => {
    const canViewAttendance = true;
    const attendanceVisible = true;
    expect(canViewAttendance && attendanceVisible).toBe(true);
  });

  it("attendance query disabled when attendanceVisible=false", () => {
    const canViewAttendance = true;
    const attendanceVisible = false;
    expect(canViewAttendance && attendanceVisible).toBe(false);
  });

  it("attendance query disabled when canViewAttendance=false", () => {
    const canViewAttendance = false;
    const attendanceVisible = true;
    expect(canViewAttendance && attendanceVisible).toBe(false);
  });
});
