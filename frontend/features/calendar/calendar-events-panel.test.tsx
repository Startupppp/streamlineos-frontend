import { render, screen } from "@testing-library/react";
import { CalendarEventsPanel } from "./calendar-events-panel";
import type { CalendarListItem } from "@/hooks/api/calendar";

jest.mock("react-window", () => ({
  List: jest.fn(
    ({ rowCount }: { rowCount: number }) => (
      <div data-testid="virtual-list" data-row-count={String(rowCount)} />
    ),
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

function makeEvent(id: string, start: string): CalendarListItem {
  return {
    id,
    title: `Event ${id}`,
    start,
    end: start,
    allDay: false,
    color: "blue",
    category: "personal",
    source: "event",
  };
}

const noop = (_id: string) => undefined;

describe("CalendarEventsPanel", () => {
  it("delegates rendering to react-window List rather than mapping all items into the DOM", () => {
    const events = [
      makeEvent("1", "2026-09-02T12:00:00"),
      makeEvent("2", "2026-09-02T14:00:00"),
      makeEvent("3", "2026-09-03T10:00:00"),
    ];
    render(<CalendarEventsPanel mode="list" events={events} onSelectEvent={noop} />);
    const list = screen.getByTestId("virtual-list");
    expect(list).not.toBeNull();
    // 2 day-header rows + 3 event rows = 5
    expect(list.getAttribute("data-row-count")).toBe("5");
  });

  it("includes one header row per day group in the rowCount", () => {
    const events = [
      makeEvent("1", "2026-09-01T10:00:00"),
      makeEvent("2", "2026-09-01T11:00:00"),
      makeEvent("3", "2026-09-01T12:00:00"),
    ];
    render(<CalendarEventsPanel mode="list" events={events} onSelectEvent={noop} />);
    const list = screen.getByTestId("virtual-list");
    // 1 day-header row + 3 event rows = 4
    expect(list.getAttribute("data-row-count")).toBe("4");
  });

  it("renders the empty state and NOT the virtual list when there are no events", () => {
    render(<CalendarEventsPanel mode="list" events={[]} onSelectEvent={noop} />);
    expect(screen.queryByTestId("virtual-list")).toBeNull();
    expect(screen.getByTestId("empty-state")).not.toBeNull();
  });

  it("passes rowCount = 0 is never reached — List is unmounted for empty data", () => {
    render(<CalendarEventsPanel mode="list" events={[]} onSelectEvent={noop} />);
    const list = screen.queryByTestId("virtual-list");
    expect(list).toBeNull();
  });
});
