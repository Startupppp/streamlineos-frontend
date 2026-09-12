import { render, screen } from "@testing-library/react";
import React from "react";
import { CalendarEventsPanel } from "./calendar-events-panel";
import type { CalendarListItem } from "@/hooks/api/calendar";

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text, className }: { text: string; className?: string }) => (
    <span className={className}>{text}</span>
  ),
}));

jest.mock("react-window", () => ({
  List: function MockList({
    rowComponent: RowComp,
    rowCount,
    rowProps,
  }: {
    rowComponent: React.ComponentType<{
      index: number;
      style: React.CSSProperties;
      ariaAttributes: Record<string, string>;
      rows: unknown[];
      onSelectEvent: (id: string) => void;
    }>;
    rowCount: number;
    rowProps: { rows: unknown[]; onSelectEvent: (id: string) => void };
  }) {
    return (
      <div>
        {Array.from({ length: rowCount }, (_, i) => (
          <RowComp
            key={i}
            index={i}
            style={{}}
            ariaAttributes={{}}
            rows={rowProps.rows}
            onSelectEvent={rowProps.onSelectEvent}
          />
        ))}
      </div>
    );
  },
  useDynamicRowHeight: jest.requireActual("react-window").useDynamicRowHeight,
}));

const AUTHORED_ZONE = "America/New_York";

function zonedEvent(): CalendarListItem {
  return {
    id: "event-7",
    title: "Sprint review",
    start: "2026-09-12T14:00:00.000Z",
    end: "2026-09-12T15:00:00.000Z",
    allDay: false,
    color: "blue",
    category: "meeting",
    source: "event",
    timezone: AUTHORED_ZONE,
  };
}

describe("CalendarEventsPanel — event times are not misleading about timezone", () => {
  it("renders the authored timezone for an event scheduled in another zone", () => {
    render(
      <CalendarEventsPanel
        mode="list"
        events={[zonedEvent()]}
        onSelectEvent={jest.fn()}
      />,
    );

    const row = screen.getByRole("button", { name: "Sprint review" });
    expect(row.textContent).toContain(AUTHORED_ZONE);
  });

  it("renders the authored-zone wall clock, not the runner-local wall clock", () => {
    render(
      <CalendarEventsPanel
        mode="list"
        events={[zonedEvent()]}
        onSelectEvent={jest.fn()}
      />,
    );

    const row = screen.getByRole("button", { name: "Sprint review" });
    expect(row.textContent).toContain("10:00");
  });

  it("still labels an all-day event as all day rather than a clock time", () => {
    const allDay: CalendarListItem = {
      ...zonedEvent(),
      id: "event-8",
      title: "Company offsite",
      allDay: true,
    };
    render(
      <CalendarEventsPanel mode="list" events={[allDay]} onSelectEvent={jest.fn()} />,
    );

    const row = screen.getByRole("button", { name: "Company offsite" });
    expect(row.textContent).toContain("All day");
  });
});
