import { format } from "date-fns";
import { calendarSavedViewDateLogic, calendarSavedViewWindow } from "./calendar-saved-view-date";

describe("calendar saved view date logic", () => {
  it("resolves today in the viewer's local calendar day", () => {
    const window = calendarSavedViewWindow({ kind: "today" }, new Date(2026, 9, 13, 23, 30));
    expect(format(new Date(window.start), "yyyy-MM-dd HH:mm")).toBe("2026-10-13 00:00");
    expect(format(new Date(window.end), "yyyy-MM-dd HH:mm")).toBe("2026-10-14 00:00");
  });

  it("starts the week on Monday", () => {
    const window = calendarSavedViewWindow({ kind: "this-week" }, new Date(2026, 9, 15, 12));
    expect(format(new Date(window.start), "yyyy-MM-dd")).toBe("2026-10-12");
    expect(format(new Date(window.end), "yyyy-MM-dd")).toBe("2026-10-19");
  });

  it("retains an explicit range", () => {
    const window = calendarSavedViewWindow({ kind: "custom", start: "2026-10-01T00:00:00.000Z", end: "2026-10-02T00:00:00.000Z" }, new Date());
    expect(window).toEqual({ start: "2026-10-01T00:00:00.000Z", end: "2026-10-02T00:00:00.000Z" });
  });

  it("saves the selected local day as a custom range", () => {
    const logic = calendarSavedViewDateLogic("custom", new Date(2026, 9, 13, 18));
    expect(logic.kind).toBe("custom");
    if (logic.kind !== "custom") throw new Error("Expected custom range");
    expect(format(new Date(logic.start), "yyyy-MM-dd HH:mm")).toBe("2026-10-13 00:00");
    expect(format(new Date(logic.end), "yyyy-MM-dd HH:mm")).toBe("2026-10-14 00:00");
  });
});
