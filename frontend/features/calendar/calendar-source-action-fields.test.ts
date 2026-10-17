import type { CalendarListItem } from "@/hooks/api/calendar";
import { actionConfig, inputValue, sourceValue } from "./calendar-source-action-fields";
import { calendarProjectionFields } from "./calendar-projection-fixtures";

function sourceEvent(overrides: Partial<CalendarListItem> = {}): CalendarListItem {
  return {
    id: "build:ticket:42",
    title: "Release review",
    start: "2026-10-14T00:00:00.000Z",
    end: "2026-10-15T00:00:00.000Z",
    source: "build",
    category: "deadline",
    color: "blue",
    entityType: "ticket",
    ...calendarProjectionFields("42", "2026-10-14T00:00:00.000Z", "2026-10-15T00:00:00.000Z", true, null, "build"),
    ...overrides,
  };
}

describe("Calendar source action input", () => {
  it("keeps a source-owned date on its calendar day across viewer time zones", () => {
    const event = sourceEvent({
      time: { kind: "date", startDate: "2026-10-14", endDate: "2026-10-15" },
    });
    const config = actionConfig(event);
    if (!config) throw new Error("Build ticket action is unavailable");
    expect(inputValue(event, config)).toBe("2026-10-14");
    expect(sourceValue("2026-10-16", config)).toBe("2026-10-16");
  });

  it("does not offer a source action for an unsupported record type", () => {
    expect(actionConfig(sourceEvent({ entityType: "project" }))).toBeNull();
  });
});
