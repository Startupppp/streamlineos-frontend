import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EventDetailSheet } from "./event-detail-sheet";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { downloadCalendarExport } from "./calendar-export";

jest.mock("./calendar-export", () => ({
  downloadCalendarExport: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/hooks/api/calendar", () => ({
  parseCalendarEventId: jest.fn((id: string) => ({ eventId: Number(id), occurrenceStart: null })),
  useDeleteCalendarEvent: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCancelOccurrence: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useRsvpCalendarEvent: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateCalendarEvent: () => ({ mutateAsync: jest.fn() }),
  useCalendarEvent: () => ({
    data: { canManage: true, isRecurring: false, rrule: null },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("./event-detail-content", () => ({
  EventDetailContent: () => null,
  getEventColor: () => "#3b82f6",
  RSVP_STATUS_LABELS: { accepted: "Accepted", declined: "Declined", tentative: "Tentative" },
}));

jest.mock("./event-create-dialog", () => ({
  EventCreateDialog: () => null,
}));

jest.mock("./calendar-lazy-fallbacks", () => ({
  CalendarListFallback: () => null,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockDownload = downloadCalendarExport as jest.Mock;

const sameDayEvent: CalendarListItem = {
  id: "42",
  title: "Morning Standup",
  start: "2026-09-30T09:00:00",
  end: "2026-09-30T10:00:00",
  allDay: false,
  color: "blue",
  category: "meeting",
  source: "event",
};

beforeEach(() => jest.clearAllMocks());

describe("EventDetailSheet — export day with same-day event (#178)", () => {
  it("passes a to-date strictly after from-date so the backend does not 400", async () => {
    render(<EventDetailSheet event={sameDayEvent} onClose={jest.fn()} />);

    const exportBtn = screen.getByRole("button", { name: /export/i });
    fireEvent.click(exportBtn);

    await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));

    const [from, to] = mockDownload.mock.calls[0] as [string, string];
    expect(new Date(to).getTime()).toBeGreaterThan(new Date(from).getTime());
  });

  it("passes from as the event start date in YYYY-MM-DD format", async () => {
    render(<EventDetailSheet event={sameDayEvent} onClose={jest.fn()} />);

    const exportBtn = screen.getByRole("button", { name: /export/i });
    fireEvent.click(exportBtn);

    await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));

    const [from] = mockDownload.mock.calls[0] as [string, string];
    expect(from).toBe("2026-09-30");
  });
});
