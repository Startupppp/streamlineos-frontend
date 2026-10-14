import { render, screen } from "@testing-library/react";
import { List } from "react-window";
import { CalendarMyDayPanel } from "./calendar-my-day-panel";
import { calendarProjectionFields } from "./calendar-projection-fixtures";
import type { CalendarListItem } from "@/hooks/api/calendar-types";

jest.mock("react-window", () => ({
  List: jest.fn(({ rowCount }: { rowCount: number }) => (
    <div data-testid="virtual-list" data-row-count={String(rowCount)} />
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
});
