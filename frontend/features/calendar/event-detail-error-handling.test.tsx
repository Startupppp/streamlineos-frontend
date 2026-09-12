import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { EventDetailSheet } from "./event-detail-sheet";

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : "Unknown error"),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("./calendar-export", () => ({
  downloadCalendarExport: jest.fn().mockRejectedValue(new Error("Export denied")),
}));

jest.mock("./event-detail-content", () => ({
  EventDetailContent: () => <div data-testid="event-detail-content" />,
  getEventColor: () => "#3b82f6",
  RSVP_STATUS_LABELS: { accepted: "Accepted", declined: "Declined", tentative: "Tentative" },
}));

jest.mock("./event-create-dialog", () => ({
  EventCreateDialog: () => null,
}));

jest.mock("@/hooks/api/calendar", () => ({
  parseCalendarEventId: (id: string) => {
    const match = /^event-(\d+)/.exec(id);
    if (!match?.[1]) return null;
    return { eventId: Number(match[1]), occurrenceStart: null };
  },
  useCalendarEvent: jest.fn().mockReturnValue({
    data: { id: 1, isRecurring: false, canManage: true },
    isLoading: false,
  }),
  useDeleteCalendarEvent: jest.fn(),
  useCancelOccurrence: jest.fn().mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useRsvpCalendarEvent: jest.fn().mockReturnValue({
    mutateAsync: jest.fn().mockRejectedValue(new Error("RSVP permission denied")),
    isPending: false,
  }),
  useUpdateCalendarEvent: jest.fn().mockReturnValue({
    mutateAsync: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: {},
  }),
}));

jest.mock("next/dynamic", () => () => () => null);

import type { CalendarListItem } from "@/hooks/api/calendar";

type CalendarMock = {
  useDeleteCalendarEvent: jest.Mock;
  useRsvpCalendarEvent: jest.Mock;
};

function getCalendarMock() {
  return jest.requireMock<CalendarMock>("@/hooks/api/calendar");
}

type SonnerMock = { toast: { error: jest.Mock; success: jest.Mock } };

function getSonnerMock() {
  return jest.requireMock<SonnerMock>("sonner");
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

describe("EventDetailSheet — error messages go through getErrorMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCalendarMock().useDeleteCalendarEvent.mockReturnValue({
      mutateAsync: jest.fn().mockRejectedValue(new Error("Event not found")),
      isPending: false,
    });
  });

  it("shows the server error message (not a hardcoded string) when delete fails", async () => {
    render(<EventDetailSheet event={baseEvent} onClose={jest.fn()} />);

    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      const confirmBtn = screen.getByRole("button", { name: /^delete$/i });
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(getSonnerMock().toast.error).toHaveBeenCalledWith("Event not found");
      expect(getSonnerMock().toast.error).not.toHaveBeenCalledWith(
        "Failed to delete event",
      );
    });
  });
});
