import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { List } from "react-window";
import { CalendarMyDayPanel } from "./calendar-my-day-panel";
import { calendarProjectionFields } from "./calendar-projection-fixtures";
import type { CalendarListItem } from "@/hooks/api/calendar-types";

jest.mock("react-window", () => ({
  List: jest.fn(({ rowCount, rowComponent: Row, rowProps }: { rowCount: number; rowComponent: ComponentType<Record<string, unknown>>; rowProps: Record<string, unknown> }) => (
    <div data-testid="virtual-list" data-row-count={String(rowCount)}>
      {Array.from({ length: rowCount }, (_, index) => <Row key={index} index={index} style={{}} ariaAttributes={{}} {...rowProps} />)}
    </div>
  )),
  useDynamicRowHeight: jest.requireActual("react-window").useDynamicRowHeight,
}));

function event(id: string, start: string, complete = false): CalendarListItem {
  return {
    id,
    title: `Event ${id}`,
    start,
    end: start,
    allDay: false,
    color: "blue",
    category: "personal",
    source: "event",
    ...calendarProjectionFields(id, start),
    actions: { view: true, edit: false, delete: false, rsvp: false, complete },
  };
}

describe("CalendarMyDayPanel", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps a view-only open task out of Action needed", () => {
    const viewOnlyTask: CalendarListItem = {
      ...event("view-only", "2000-01-01T09:00:00.000Z"),
      category: "task",
      status: "open",
    };
    const completableTask: CalendarListItem = {
      ...event("completable", "2000-01-01T10:00:00.000Z", true),
      category: "task",
      status: "open",
    };
    render(
      <CalendarMyDayPanel
        events={[viewOnlyTask, completableTask]}
        pages={[]}
        search=""
        onSearchChange={jest.fn()}
        onSelectEvent={jest.fn()}
        onLoadMore={jest.fn()}
        hasMore={false}
        isLoadingMore={false}
      />,
    );

    expect((List as unknown as jest.Mock).mock.lastCall?.[0].rowProps.rows).toEqual([
      { type: "header", title: "Action needed" },
      { type: "event", event: completableTask },
      { type: "header", title: "For your information" },
      { type: "event", event: viewOnlyTask },
    ]);
  });

  it("virtualizes grouped items and requests the next page at the last row", () => {
    const onLoadMore = jest.fn();
    render(
      <CalendarMyDayPanel
        events={[
          event("action", "2026-01-01T09:00:00.000Z", true),
          event("info", "2026-01-01T10:00:00.000Z"),
        ]}
        pages={[]}
        search=""
        onSearchChange={jest.fn()}
        onSelectEvent={jest.fn()}
        onLoadMore={onLoadMore}
        hasMore
        isLoadingMore={false}
      />,
    );

    expect(screen.getByTestId("virtual-list").getAttribute("data-row-count")).toBe("4");
    const props = (List as unknown as jest.Mock).mock.calls[0]?.[0] as {
      onRowsRendered: (range: { startIndex: number; stopIndex: number }) => void;
    };
    props.onRowsRendered({ startIndex: 0, stopIndex: 2 });
    expect(onLoadMore).not.toHaveBeenCalled();
    props.onRowsRendered({ startIndex: 0, stopIndex: 3 });
    props.onRowsRendered({ startIndex: 0, stopIndex: 3 });
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("continues an empty page automatically", () => {
    const onLoadMore = jest.fn();
    render(
      <CalendarMyDayPanel
        events={[]}
        pages={[]}
        search=""
        onSearchChange={jest.fn()}
        onSelectEvent={jest.fn()}
        onLoadMore={onLoadMore}
        hasMore
        isLoadingMore={false}
      />,
    );

    expect(screen.queryByTestId("virtual-list")).toBeNull();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Continue calendar items" })).toBeNull();
  });

  it("continues an empty search after the search term changes", () => {
    const onLoadMore = jest.fn();
    const props = {
      events: [],
      pages: [],
      onSearchChange: jest.fn(),
      onSelectEvent: jest.fn(),
      onLoadMore,
      hasMore: true,
      isLoadingMore: false,
    };
    const { rerender } = render(<CalendarMyDayPanel {...props} search="first" />);
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender(<CalendarMyDayPanel {...props} search="second" />);

    expect(onLoadMore).toHaveBeenCalledTimes(2);
    rerender(<CalendarMyDayPanel {...props} search="second" />);
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it("names each action with its event and opens only the selected event", () => {
    const onSelectEvent = jest.fn();
    const first = event("first", "2026-01-01T09:00:00.000Z");
    const second = event("second", "2026-01-01T10:00:00.000Z");
    render(
      <CalendarMyDayPanel
        events={[first, second]}
        pages={[]}
        search=""
        onSearchChange={jest.fn()}
        onSelectEvent={onSelectEvent}
        onLoadMore={jest.fn()}
        hasMore={false}
        isLoadingMore={false}
      />,
    );

    const firstAction = screen.getByRole("button", { name: /Open Event first, .*event to view/ });
    expect(screen.getByRole("button", { name: /Open Event second, .*event to view/ })).toBeTruthy();
    fireEvent.click(firstAction);
    expect(onSelectEvent).toHaveBeenCalledWith(first);
    expect(onSelectEvent).toHaveBeenCalledTimes(1);
  });
});
