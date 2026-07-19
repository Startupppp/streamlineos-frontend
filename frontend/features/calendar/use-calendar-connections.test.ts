import { isCalendarToolkit } from "./use-calendar-connections";

describe("isCalendarToolkit", () => {
  it("includes calendar-capable toolkits", () => {
    expect(isCalendarToolkit("googlecalendar")).toBe(true);
    expect(isCalendarToolkit("outlook")).toBe(true);
  });

  it("excludes gmail so mail accounts never appear in calendar surfaces", () => {
    expect(isCalendarToolkit("gmail")).toBe(false);
  });
});
