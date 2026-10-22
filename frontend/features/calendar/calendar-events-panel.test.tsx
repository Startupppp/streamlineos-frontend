import { fireEvent, render, screen } from "@testing-library/react";
import { CalendarEventsPanel } from "./calendar-events-panel";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { calendarProjectionFields } from "./calendar-projection-fixtures";
import { List } from "react-window";

jest.mock("react-window", () => ({
  List: jest.fn(
    ({ rowCount, onRowsRendered }: { rowCount: number; onRowsRendered?: (range: { startIndex: number; stopIndex: number }) => void }) => (
      <div
        data-testid="virtual-list"
        data-row-count={String(rowCount)}
        onClick={() => onRowsRendered?.({ startIndex: 0, stopIndex: rowCount - 1 })}
      />
    ),
  ),
  useDynamicRowHeight: jest.requireActual("react-window").useDynamicRowHeight,
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
    ...calendarProjectionFields(id, start),
  };
}

const noop = (_event: CalendarListItem) => undefined;

describe("CalendarEventsPanel", () => {
  it("orders historical multi-day events by their completion and groups the last occupied day", () => {
    const long = {
      ...makeEvent("long", "2020-09-01T09:00:00.000Z"),
      end: "2020-09-10T09:00:00.000Z",
    };
    const short = {
      ...makeEvent("short", "2020-09-08T09:00:00.000Z"),
      end: "2020-09-09T09:00:00.000Z",
    };

    render(
      <CalendarEventsPanel
        mode="history"
        events={[short, long]}
        onSelectEvent={noop}
      />,
    );

    const props = (List as jest.Mock).mock.calls.at(-1)?.[0] as {
      rowKey: (index: number, data: { rows: unknown[] }) => string;
      rowProps: { rows: unknown[] };
    };
    expect(
      props.rowProps.rows.map((_, index) =>
        props.rowKey(index, props.rowProps),
      ),
    ).toEqual([
      "hdr:2020-09-10",
      "evt:long",
      "hdr:2020-09-09",
      "evt:short",
    ]);
  });

  it("delegates rendering to react-window List rather than mapping all items into the DOM", () => {
    const events = [
      makeEvent("1", "2026-09-02T12:00:00"),
      makeEvent("2", "2026-09-02T14:00:00"),
      makeEvent("3", "2026-09-03T10:00:00"),
    ];
    render(<CalendarEventsPanel mode="list" events={events} onSelectEvent={noop} />);
    const list = screen.getByTestId("virtual-list");
    expect(list).not.toBeNull();
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
    expect(list.getAttribute("data-row-count")).toBe("4");
  });

  it("groups date-only events under their explicit calendar date", () => {
    const event: CalendarListItem = {
      ...makeEvent("all-day", "2027-01-25T10:00:00.000Z"),
      allDay: true,
      timeKind: "date",
      time: { kind: "date", startDate: "2027-01-26", endDate: "2027-01-26" },
    };
    render(<CalendarEventsPanel mode="list" events={[event]} onSelectEvent={noop} />);

    const props = (List as jest.Mock).mock.calls.at(-1)?.[0] as {
      rowKey: (index: number, data: { rows: unknown[] }) => string;
      rowProps: { rows: unknown[] };
    };
    expect(props.rowKey(0, props.rowProps)).toBe("hdr:2027-01-26");
  });

  it("keeps an overnight event whose interval overlaps the visible day", () => {
    const overnight = {
      ...makeEvent("overnight", "2026-09-01T23:00:00.000Z"),
      end: "2026-09-02T01:00:00.000Z",
    };
    render(
      <CalendarEventsPanel
        mode="list"
        events={[overnight]}
        range={{
          start: new Date("2026-09-02T00:00:00.000Z"),
          end: new Date("2026-09-02T23:59:59.999Z"),
        }}
        onSelectEvent={noop}
      />,
    );
    expect(screen.getByTestId("virtual-list").getAttribute("data-row-count")).toBe("2");
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

  it("continues an empty history page automatically", () => {
    const onLoadMore = jest.fn();
    render(
      <CalendarEventsPanel
        mode="history"
        events={[]}
        onSelectEvent={jest.fn()}
        hasMore
        onLoadMore={onLoadMore}
        loadedPageCount={1}
      />,
    );

    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Load older events" })).toBeNull();
  });

  it("requests one older page when the virtual history tail enters view", () => {
    const onLoadMore = jest.fn();
    render(
      <CalendarEventsPanel
        mode="history"
        events={[makeEvent("past", "2020-09-02T12:00:00.000Z")]}
        onSelectEvent={noop}
        hasMore
        onLoadMore={onLoadMore}
        loadedPageCount={1}
      />,
    );

    fireEvent.click(screen.getByTestId("virtual-list"));
    fireEvent.click(screen.getByTestId("virtual-list"));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("pauses automatic paging after a history window adds no visible events", () => {
    const onLoadMore = jest.fn();
    render(
      <CalendarEventsPanel
        mode="history"
        events={[makeEvent("past", "2020-09-02T12:00:00.000Z")]}
        onSelectEvent={noop}
        hasMore
        autoLoadMore={false}
        onLoadMore={onLoadMore}
        loadedPageCount={2}
      />,
    );

    fireEvent.click(screen.getByTestId("virtual-list"));
    expect(onLoadMore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Load older events" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("does not request another cursor while URL history pages are being restored", () => {
    const onLoadMore = jest.fn();
    render(
      <CalendarEventsPanel
        mode="history"
        events={[makeEvent("past", "2020-09-02T12:00:00.000Z")]}
        onSelectEvent={noop}
        hasMore={false}
        onLoadMore={onLoadMore}
        loadedPageCount={1}
      />,
    );

    fireEvent.click(screen.getByTestId("virtual-list"));
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
