import { calendarUrl, parseCalendarUrlState } from "./calendar-url-state";

const FALLBACK = new Date("2026-10-13T09:30:00.000Z");

describe("calendar URL state", () => {
  it("parses the durable date, view, filters, history position, and selection", () => {
    const state = parseCalendarUrlState(new URLSearchParams({
      date: "2026-08-17",
      view: "month",
      mode: "history",
      hr: "0",
      crm: "1",
      attendance: "0",
      hiddenAccounts: "9,4,9",
      filter: "my-team",
      event: "external:9:provider/event",
      eventSource: "external",
      historyBefore: "2026-08-18T00:00:00.000Z",
      historyPages: "7",
    }), FALLBACK);

    expect(state.date.getFullYear()).toBe(2026);
    expect(state.date.getMonth()).toBe(7);
    expect(state.date.getDate()).toBe(17);
    expect(state.view).toBe("month");
    expect(state.mode).toBe("history");
    expect(state.hrVisible).toBe(false);
    expect(state.crmVisible).toBe(true);
    expect(state.attendanceVisible).toBe(false);
    expect(state.hiddenConnectionIds).toEqual([9, 4]);
    expect(state.savedFilterId).toBe("my-team");
    expect(state.selected).toEqual({ source: "external", id: "external:9:provider/event" });
    expect(state.historyBefore).toBe("2026-08-18T00:00:00.000Z");
    expect(state.historyPages).toBe(7);
  });

  it("falls back safely for invalid or oversized state", () => {
    const state = parseCalendarUrlState(new URLSearchParams({
      date: "2026-02-30",
      view: "agenda",
      mode: "private-record",
      hr: "maybe",
      hiddenAccounts: "0,-1,abc,2147483648",
      filter: "not allowed",
      event: "secret",
      eventSource: "unknown",
      historyBefore: "bad",
      historyPages: "999",
    }), FALLBACK);

    expect(state.date).toBe(FALLBACK);
    expect(state.view).toBe("week");
    expect(state.mode).toBe("calendar");
    expect(state.hrVisible).toBe(true);
    expect(state.hiddenConnectionIds).toEqual([]);
    expect(state.savedFilterId).toBeNull();
    expect(state.selected).toBeNull();
    expect(state.historyBefore).toBe(FALLBACK.toISOString());
    expect(state.historyPages).toBe(1);
  });

  it("updates owned parameters while preserving integration callback state", () => {
    const url = calendarUrl(
      new URLSearchParams("connected_account_id=abc&mode=list&filter=mine"),
      { mode: "history", historyPages: "3", event: null },
    );

    expect(url).toBe(
      "/calendar?connected_account_id=abc&mode=history&filter=mine&historyPages=3",
    );
  });
});
