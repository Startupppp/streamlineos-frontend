import { addHolidaySchema } from "./org-holiday-calendar-schema";

describe("add holiday form", () => {
  it("accepts a valid holiday entry", () => {
    expect(
      addHolidaySchema.safeParse({
        name: "Republic Day",
        date: "2026-01-26",
        recurring: true,
      }).success,
    ).toBe(true);
  });

  it("requires a non-empty name", () => {
    expect(
      addHolidaySchema.safeParse({
        name: "",
        date: "2026-01-26",
      }).success,
    ).toBe(false);
  });

  it("rejects a date that does not match YYYY-MM-DD", () => {
    expect(
      addHolidaySchema.safeParse({
        name: "Republic Day",
        date: "26-01-2026",
      }).success,
    ).toBe(false);
  });

  it("rejects a free-text date string", () => {
    expect(
      addHolidaySchema.safeParse({
        name: "Republic Day",
        date: "January 26, 2026",
      }).success,
    ).toBe(false);
  });

  it("accepts an entry without the optional recurring field", () => {
    expect(
      addHolidaySchema.safeParse({
        name: "Diwali",
        date: "2026-10-20",
      }).success,
    ).toBe(true);
  });

  it("rejects a name that exceeds 200 characters", () => {
    expect(
      addHolidaySchema.safeParse({
        name: "A".repeat(201),
        date: "2026-01-26",
      }).success,
    ).toBe(false);
  });
});
