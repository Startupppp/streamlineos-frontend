import { render, screen } from "@testing-library/react";
import { UpcomingEventsWidget } from "./upcoming-events-widget";

const personalDashboard = jest.fn();

jest.mock("@/hooks/api/dashboard", () => ({
  usePersonalDashboard: () => personalDashboard(),
}));

const EVENT = {
  id: 42,
  title: "Sprint review",
  startTime: "2026-10-01T09:00:00.000Z",
  endTime: "2026-10-01T10:00:00.000Z",
  type: "MEETING",
};

beforeEach(() => {
  jest.clearAllMocks();
  personalDashboard.mockReturnValue({
    data: { upcomingEvents: [EVENT] },
    isLoading: false,
    isError: false,
  });
});

describe("the Home dashboard's upcoming events are reachable", () => {
  it("links each event to the calendar route that opens that event, instead of rendering a dead row", () => {
    render(<UpcomingEventsWidget />);
    expect(screen.getByRole("link", { name: /sprint review/i })).toHaveAttribute(
      "href",
      "/calendar?event=42",
    );
  });
});
