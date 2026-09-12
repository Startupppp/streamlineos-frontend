import { render, screen } from "@testing-library/react";
import React from "react";
import { EventDetailSheet } from "./event-detail-sheet";
import type { CalendarEventDetail, CalendarListItem } from "@/hooks/api/calendar";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : "Unknown error"),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("./calendar-export", () => ({ downloadCalendarExport: jest.fn() }));

jest.mock("./event-detail-content", () => ({
  EventDetailContent: ({ canUpdate }: { canUpdate: boolean }) => (
    <div data-testid="event-detail-content" data-can-update={String(canUpdate)} />
  ),
  getEventColor: () => "#3b82f6",
  RSVP_STATUS_LABELS: { accepted: "Accepted", declined: "Declined", tentative: "Tentative" },
}));

jest.mock("./event-create-dialog", () => ({ EventCreateDialog: () => null }));

jest.mock("@/hooks/api/calendar", () => ({
  parseCalendarEventId: (id: string) => {
    const match = /^event-(\d+)/.exec(id);
    if (!match?.[1]) return null;
    return { eventId: Number(match[1]), occurrenceStart: null };
  },
  useCalendarEvent: jest.fn(),
  useDeleteCalendarEvent: jest.fn().mockReturnValue({ mutateAsync: jest.fn(), isPending: false }),
  useCancelOccurrence: jest.fn().mockReturnValue({ mutateAsync: jest.fn(), isPending: false }),
  useRsvpCalendarEvent: jest.fn().mockReturnValue({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateCalendarEvent: jest.fn().mockReturnValue({ mutateAsync: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn().mockReturnValue(false) }));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("next/dynamic", () => () => () => null);

type CalendarMock = { useCalendarEvent: jest.Mock };

function getCalendarMock() {
  return jest.requireMock<CalendarMock>("@/hooks/api/calendar");
}

const baseEvent: CalendarListItem = {
  id: "event-1",
  title: "Team sync",
  start: "2026-09-12T10:00:00Z",
  end: "2026-09-12T11:00:00Z",
  source: "event",
  category: "meeting",
  color: "blue",
};

function detailFixture(overrides: Partial<CalendarEventDetail>): CalendarEventDetail {
  return {
    id: 1,
    title: "Team sync",
    startDate: "2026-09-12T10:00:00Z",
    endDate: "2026-09-12T11:00:00Z",
    allDay: false,
    timezone: "UTC",
    color: "blue",
    category: "meeting",
    entityType: null,
    entityId: null,
    location: null,
    meetingUrl: null,
    description: null,
    creatorName: "Ada Creator",
    myRsvpStatus: null,
    linkedTicket: null,
    rrule: null,
    isRecurring: false,
    canManage: false,
    localVersion: 1,
    ...overrides,
  };
}

function setDetail(detail: CalendarEventDetail | null, isLoading = false) {
  getCalendarMock().useCalendarEvent.mockReturnValue({ data: detail, isLoading });
}

describe("EventDetailSheet — mutation controls follow the backend's creator-only predicate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.requireMock<{ useCan: jest.Mock }>("@/hooks/api/access").useCan.mockReturnValue(false);
  });

  it("offers Delete and Edit to the creator, whose mutation the backend accepts", () => {
    setDetail(detailFixture({ canManage: true }));
    render(<EventDetailSheet event={baseEvent} onClose={jest.fn()} />);
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
  });

  it("offers Cancel occurrence to the creator of a recurring series", () => {
    setDetail(detailFixture({ canManage: true, isRecurring: true, rrule: "FREQ=WEEKLY" }));
    render(<EventDetailSheet event={baseEvent} onClose={jest.fn()} />);
    expect(screen.getByRole("button", { name: /cancel occurrence/i })).toBeInTheDocument();
  });

  it("offers no Delete, Edit or Cancel occurrence to a non-creator viewer whose mutation would 404", () => {
    setDetail(detailFixture({ canManage: false, isRecurring: true, rrule: "FREQ=WEEKLY" }));
    render(<EventDetailSheet event={baseEvent} onClose={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^edit$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /cancel occurrence/i })).toBeNull();
  });

  it("withholds Unlink from a non-creator — canUpdate reaches EventDetailContent as false", () => {
    setDetail(detailFixture({ canManage: false }));
    render(<EventDetailSheet event={baseEvent} onClose={jest.fn()} />);
    expect(screen.getByTestId("event-detail-content").dataset["canUpdate"]).toBe("false");
  });

  it("passes canUpdate true to EventDetailContent for the creator, so Unlink appears", () => {
    setDetail(detailFixture({ canManage: true }));
    render(<EventDetailSheet event={baseEvent} onClose={jest.fn()} />);
    expect(screen.getByTestId("event-detail-content").dataset["canUpdate"]).toBe("true");
  });

  it("fails CLOSED while the detail read is still in flight", () => {
    setDetail(null, true);
    render(<EventDetailSheet event={baseEvent} onClose={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^edit$/i })).toBeNull();
    expect(screen.getByTestId("event-detail-content").dataset["canUpdate"]).toBe("false");
  });

  it("fails CLOSED when the payload carries no capability at all", () => {
    getCalendarMock().useCalendarEvent.mockReturnValue({
      data: { id: 1, title: "Team sync", isRecurring: false },
      isLoading: false,
    });
    render(<EventDetailSheet event={baseEvent} onClose={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    expect(screen.getByTestId("event-detail-content").dataset["canUpdate"]).toBe("false");
  });

  it("still closes the sheet — Close is not a mutation and stays available to everyone", () => {
    setDetail(detailFixture({ canManage: false }));
    render(<EventDetailSheet event={baseEvent} onClose={jest.fn()} />);
    expect(screen.getAllByRole("button", { name: /^close$/i }).length).toBeGreaterThan(0);
  });
});
