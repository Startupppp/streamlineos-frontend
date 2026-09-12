import { render, screen } from "@testing-library/react";
import { ExternalEventDetailSheet, type ExternalBigCalEvent } from "./external-event-detail-sheet";
import { HrEventDetailSheet } from "./hr-event-detail-sheet";
import { CalendarAgendaPreview } from "./calendar-lazy-fallbacks";
import type { BigCalEvent } from "./big-calendar-wrapper";
import type { CalendarListItem } from "@/hooks/api/calendar";

const READER_ZONE = "America/New_York";
const CLOCK = /\d{1,2}:\d{2}/;

const realResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;

beforeAll(() => {
  jest
    .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
    .mockImplementation(function pinnedReaderZone(this: Intl.DateTimeFormat) {
      return { ...realResolvedOptions.call(this), timeZone: READER_ZONE };
    });
});

afterAll(() => {
  jest.restoreAllMocks();
});

function externalAllDay(): BigCalEvent {
  return {
    id: "ext-1-abc",
    title: "Republic Day",
    start: new Date("2026-01-26T00:00:00.000Z"),
    end: new Date("2026-01-27T00:00:00.000Z"),
    allDay: true,
    resource: { source: "external", accountEmail: "someone@example.com" },
  };
}

function externalTimed(): BigCalEvent {
  return {
    id: "ext-1-def",
    title: "Partner sync",
    start: new Date("2027-09-14T13:00:00.000Z"),
    end: new Date("2027-09-14T14:00:00.000Z"),
    allDay: false,
    resource: { source: "external", accountEmail: "someone@example.com" },
  };
}

function hrAllDay(): BigCalEvent {
  return {
    id: "hr-holiday-3",
    title: "Founders Day",
    start: new Date("2026-01-26T00:00:00.000Z"),
    end: new Date("2026-01-26T00:00:00.000Z"),
    allDay: true,
    resource: { source: "hr", hrEventType: "HOLIDAY" },
  };
}

function agendaTimed(): CalendarListItem {
  return {
    id: "event-9",
    title: "Standup",
    start: "2027-09-14T14:00:00.000Z",
    end: "2027-09-14T14:30:00.000Z",
    allDay: false,
    category: "meeting",
    source: "event",
    timezone: "Asia/Kolkata",
  };
}

function agendaAuthoredAllDay(): CalendarListItem {
  return {
    id: "event-10",
    title: "Company offsite",
    start: "2027-01-25T18:30:00.000Z",
    end: "2027-01-26T18:30:00.000Z",
    allDay: true,
    category: "meeting",
    source: "event",
    timezone: "Asia/Kolkata",
  };
}

function agendaZonelessAllDay(): CalendarListItem {
  return {
    id: "holiday-3",
    title: "Company holiday",
    start: "2027-01-26T12:00:00.000Z",
    end: "2027-01-26T12:00:00.000Z",
    allDay: true,
    category: "holiday",
    source: "holiday",
    timezone: null,
  };
}

function sheetText(): string {
  const content = document.querySelector("[data-slot='sheet-content']");
  return content?.textContent ?? "";
}

describe("ExternalEventDetailSheet — provider events carry no authored zone", () => {
  it("keeps an all-day provider event on its own calendar day for a reader west of UTC", () => {
    render(<ExternalEventDetailSheet event={externalAllDay()} onClose={jest.fn()} />);

    const text = sheetText();
    expect(text).toContain("26 Jan 2026");
    expect(text).not.toContain("25 Jan 2026");
  });

  it("renders no wall-clock time at all for an all-day provider event", () => {
    render(<ExternalEventDetailSheet event={externalAllDay()} onClose={jest.fn()} />);

    const text = sheetText();
    expect(text).toContain("All day");
    expect(CLOCK.test(text)).toBe(false);
  });

  it("names the zone the clock of a timed provider event is being read in", () => {
    render(<ExternalEventDetailSheet event={externalTimed()} onClose={jest.fn()} />);

    const text = sheetText();
    expect(text).toContain("9:00");
    expect(text).toContain(READER_ZONE);
  });
});

function externalAuthoredTimed(): ExternalBigCalEvent {
  return {
    id: "ext-1-ghi",
    title: "Vendor call",
    start: new Date("2027-09-14T13:00:00.000Z"),
    end: new Date("2027-09-14T14:00:00.000Z"),
    allDay: false,
    resource: {
      source: "external",
      accountEmail: "someone@example.com",
      timezone: "Asia/Kolkata",
    },
  };
}

function externalAuthoredAllDay(): ExternalBigCalEvent {
  return {
    id: "ext-1-jkl",
    title: "Founders offsite",
    start: new Date("2026-01-26T00:00:00.000Z"),
    end: new Date("2026-01-27T00:00:00.000Z"),
    allDay: true,
    resource: {
      source: "external",
      accountEmail: "someone@example.com",
      timezone: "Asia/Kolkata",
    },
  };
}

describe("ExternalEventDetailSheet — the provider's authored zone leads, the reader's follows", () => {
  it("renders the authored wall clock and names the authored zone", () => {
    render(<ExternalEventDetailSheet event={externalAuthoredTimed()} onClose={jest.fn()} />);

    const text = sheetText();
    expect(text).toContain("Asia/Kolkata");
    expect(text).toContain("6:30");
  });

  it("still shows the reader their own reading of a foreign-zone provider event", () => {
    render(<ExternalEventDetailSheet event={externalAuthoredTimed()} onClose={jest.fn()} />);

    const text = sheetText();
    expect(text).toContain("9:00");
    expect(text).toContain(READER_ZONE);
  });

  it("keeps an all-day provider event a date with no wall clock even when a zone is present", () => {
    render(<ExternalEventDetailSheet event={externalAuthoredAllDay()} onClose={jest.fn()} />);

    const text = sheetText();
    expect(text).toContain("26 Jan 2026");
    expect(text).toContain("All day");
    expect(CLOCK.test(text)).toBe(false);
  });
});

describe("HrEventDetailSheet — HR aggregate items are zone-less calendar dates", () => {
  it("keeps the HR calendar date on its own day for a reader west of UTC", () => {
    render(<HrEventDetailSheet event={hrAllDay()} onClose={jest.fn()} />);

    const text = sheetText();
    expect(text).toContain("26 Jan 2026");
    expect(text).not.toContain("25 Jan 2026");
  });

  it("renders no wall-clock time for an HR calendar date", () => {
    render(<HrEventDetailSheet event={hrAllDay()} onClose={jest.fn()} />);

    const text = sheetText();
    expect(text).toContain("All day");
    expect(CLOCK.test(text)).toBe(false);
  });
});

describe("CalendarAgendaPreview — the authored zone leads, the reader's follows", () => {
  it("renders the authored wall clock and names the authored zone", () => {
    render(<CalendarAgendaPreview events={[agendaTimed()]} />);

    const row = screen.getByText("Standup").parentElement;
    expect(row?.textContent).toContain("Asia/Kolkata");
    expect(row?.textContent).toContain("7:30");
  });

  it("still shows the reader their own reading of a foreign-zone event", () => {
    render(<CalendarAgendaPreview events={[agendaTimed()]} />);

    const row = screen.getByText("Standup").parentElement;
    expect(row?.textContent).toContain("10:00");
    expect(row?.textContent).toContain(READER_ZONE);
  });

  it("keeps an all-day event on the calendar day it was authored on", () => {
    render(<CalendarAgendaPreview events={[agendaAuthoredAllDay()]} />);

    const row = screen.getByText("Company offsite").parentElement;
    expect(row?.textContent).toContain("26 Jan 2027");
    expect(row?.textContent).not.toContain("25 Jan 2027");
  });

  it("labels a zone-less all-day item as all day with no wall-clock time", () => {
    render(<CalendarAgendaPreview events={[agendaZonelessAllDay()]} />);

    const row = screen.getByText("Company holiday").parentElement;
    expect(row?.textContent).toContain("26 Jan 2027");
    expect(row?.textContent).toContain("All day");
    expect(CLOCK.test(row?.textContent ?? "")).toBe(false);
  });
});
