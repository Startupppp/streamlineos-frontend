import {
  COMMAND_CENTER_DUE_VALUES,
  isCommandCenterDue,
  resolveDueWindow,
} from "./command-center-utils";

const TODAY = new Date(2026, 8, 28);

describe("resolveDueWindow — the due URL parameter the Command Center spec declares", () => {
  it("returns no window at all when the due param is absent, so the unfiltered read keeps its own date semantics", () => {
    expect(resolveDueWindow(null, TODAY)).toBeUndefined();
  });

  it("returns no window for a due value the enum does not carry, so a hand-edited URL cannot send a bogus date filter", () => {
    expect(resolveDueWindow("next-decade", TODAY)).toBeUndefined();
  });

  it("bounds overdue at the day before today so a task due today is not counted as late", () => {
    expect(resolveDueWindow("overdue", TODAY)).toEqual({ dueDateTo: "2026-09-27" });
  });

  it("pins both ends of the window to today for due=today so the read is a single-day range", () => {
    expect(resolveDueWindow("today", TODAY)).toEqual({
      dueDateFrom: "2026-09-28",
      dueDateTo: "2026-09-28",
    });
  });

  it("opens the window from today to seven days out for due=week", () => {
    expect(resolveDueWindow("week", TODAY)).toEqual({
      dueDateFrom: "2026-09-28",
      dueDateTo: "2026-10-05",
    });
  });

  it("accepts every value the exported enum declares, so the enum and the resolver cannot drift", () => {
    for (const value of COMMAND_CENTER_DUE_VALUES) {
      expect(isCommandCenterDue(value)).toBe(true);
      expect(resolveDueWindow(value, TODAY)).toBeDefined();
    }
  });

  it("rejects a value outside the enum — paired negative control for the enum test above", () => {
    expect(isCommandCenterDue("quarter")).toBe(false);
  });
});
