import { render, screen } from "@testing-library/react";
import React from "react";
import { EventDetailSheet } from "./event-detail-sheet";
import type { CalendarListItem } from "@/hooks/api/calendar";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : "Unknown error"),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("./calendar-export", () => ({ downloadCalendarExport: jest.fn() }));

jest.mock("./event-detail-content", () => ({
  EventDetailContent: () => <div data-testid="event-detail-content" />,
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
  useCalendarEvent: jest.fn().mockReturnValue({ data: null, isLoading: false }),
  useDeleteCalendarEvent: jest.fn().mockReturnValue({ mutateAsync: jest.fn(), isPending: false }),
  useCancelOccurrence: jest.fn().mockReturnValue({ mutateAsync: jest.fn(), isPending: false }),
  useRsvpCalendarEvent: jest.fn().mockReturnValue({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateCalendarEvent: jest.fn().mockReturnValue({ mutateAsync: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn() }));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("next/dynamic", () => () => () => null);

type AccessMock = { useCan: jest.Mock };

function getAccessMock() {
  return jest.requireMock<AccessMock>("@/hooks/api/access");
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

describe("EventDetailSheet — export control matches the backend export authority", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("hides the export control when the member lacks calendar:events:export", () => {
    getAccessMock().useCan.mockReturnValue(false);
    render(<EventDetailSheet event={baseEvent} onClose={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /export/i })).toBeNull();
  });

  it("asks for the exact backend export permission key", () => {
    getAccessMock().useCan.mockReturnValue(true);
    render(<EventDetailSheet event={baseEvent} onClose={jest.fn()} />);
    expect(getAccessMock().useCan).toHaveBeenCalledWith("calendar:events:export");
  });

  it("shows the export control when the member holds the export permission", () => {
    getAccessMock().useCan.mockReturnValue(true);
    render(<EventDetailSheet event={baseEvent} onClose={jest.fn()} />);
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
  });

  it("does not label the CSV day export as a per-event .ics file", () => {
    getAccessMock().useCan.mockReturnValue(true);
    render(<EventDetailSheet event={baseEvent} onClose={jest.fn()} />);
    const exportButton = screen.getByRole("button", { name: /export/i });
    expect(exportButton.getAttribute("aria-label")).not.toMatch(/\.ics/i);
    expect(exportButton.textContent).not.toMatch(/\.ics/i);
  });
});
