import { render, screen } from "@testing-library/react";
import { EventDetailContent } from "./event-detail-content";
import type { CalendarEventDetail, CalendarListItem } from "@/hooks/api/calendar";
import { calendarProjectionFields } from "./calendar-projection-fixtures";

jest.mock("@/hooks/api/calendar", () => ({
  useEventAttendees: () => ({ data: [] }),
}));

jest.mock("./event-sync-status", () => ({ EventSyncStatus: () => null }));

const event: CalendarListItem = {
  id: "event-7",
  title: "Planning",
  start: "2026-10-20T09:00:00Z",
  end: "2026-10-20T10:00:00Z",
  source: "event",
  category: "meeting",
  description: "Projected agenda",
  creatorName: "Projected creator",
  entityType: "ticket",
  ...calendarProjectionFields("event-7", "2026-10-20T09:00:00Z", "2026-10-20T10:00:00Z"),
};

const detail: CalendarEventDetail = {
  id: 7,
  title: "Planning",
  startDate: "2026-10-20T09:00:00Z",
  endDate: "2026-10-20T10:00:00Z",
  allDay: false,
  timezone: "UTC",
  category: "meeting",
  color: "blue",
  entityType: "ticket",
  entityId: "12",
  location: null,
  meetingUrl: "https://example.com/meeting",
  description: "Full agenda",
  creatorName: "Full creator",
  myRsvpStatus: null,
  linkedTicket: null,
  rrule: null,
  isRecurring: false,
  canManage: false,
  localVersion: 1,
};

const baseProps = {
  event,
  numericEventId: 7,
  isCalendarEvent: true,
  canUpdate: false,
  deleteEventIsPending: false,
  rsvpMutationIsPending: false,
  onClose: jest.fn(),
  onRequestUnlink: jest.fn(),
  onRsvp: jest.fn(),
};

it("keeps projected event facts visible without skeletons until the detail arrives", () => {
  const { container, rerender } = render(
    <EventDetailContent {...baseProps} detailLoading detail={null} />,
  );

  expect(screen.getByText("Projected agenda")).toBeInTheDocument();
  expect(screen.getByText("Projected creator")).toBeInTheDocument();
  expect(screen.queryByText(/Ticket unavailable/)).not.toBeInTheDocument();
  expect(container.querySelector("[data-slot='skeleton']")).toBeNull();

  rerender(<EventDetailContent {...baseProps} detailLoading={false} detail={detail} />);

  expect(screen.getByText("Full agenda")).toBeInTheDocument();
  expect(screen.getByText("Full creator")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /join meeting/i })).toHaveAttribute(
    "href",
    "https://example.com/meeting",
  );
});
