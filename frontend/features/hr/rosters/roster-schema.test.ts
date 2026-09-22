import { isNotMonday, nextRosterMonday, rosterSchema, rosterWeekEnd } from "./roster-schema";

describe("a roster week starts on the Monday the label promises", () => {
  it("defaults to the coming Monday, or today when today is one", () => {
    expect(nextRosterMonday(new Date(2026, 8, 23))).toBe("2026-09-28");
    expect(nextRosterMonday(new Date(2026, 8, 28))).toBe("2026-09-28");
  });

  it("refuses a Sunday and accepts a Monday", () => {
    expect(rosterSchema.safeParse({ name: "W40", weekStart: "2026-09-27" }).success).toBe(false);
    expect(rosterSchema.safeParse({ name: "W40", weekStart: "2026-09-28" }).success).toBe(true);
  });

  it("derives the week end from the calendar date, never from a UTC-shifted instant", () => {
    expect(rosterWeekEnd("2026-09-28")).toBe("2026-10-04");
    expect(rosterWeekEnd("")).toBe("");
  });

  it("disables every day but Monday in the picker", () => {
    expect(isNotMonday(new Date(2026, 8, 27))).toBe(true);
    expect(isNotMonday(new Date(2026, 8, 28))).toBe(false);
  });
});
