"use client";

import { render, screen, fireEvent } from "@testing-library/react";
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
    rowProps: {
      rows: unknown[];
      onSelectEvent: (id: string) => void;
    };
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

function makeEvent(id: string, start: string, title = `Event ${id}`): CalendarListItem {
  return {
    id,
    title,
    start,
    end: start,
    allDay: false,
    color: "blue",
    category: "general",
    source: "event",
  };
}

describe("CalendarEventsPanel — keyboard accessibility", () => {
  it("event buttons carry an aria-label matching the event title so screen readers announce the event", () => {
    const events = [makeEvent("1", "2026-09-12T10:00:00", "Board review")];
    render(
      <CalendarEventsPanel mode="list" events={events} onSelectEvent={jest.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: "Board review" }),
    ).toBeInTheDocument();
  });

  it("keyboard Enter on an event button fires onSelectEvent with the event id", () => {
    const onSelectEvent = jest.fn();
    const events = [makeEvent("ev-42", "2026-09-12T10:00:00", "Sprint planning")];
    render(
      <CalendarEventsPanel mode="list" events={events} onSelectEvent={onSelectEvent} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sprint planning" }));
    expect(onSelectEvent).toHaveBeenCalledWith("ev-42");
  });

  it("multiple events all get distinct aria-labels", () => {
    const events = [
      makeEvent("1", "2026-09-12T09:00:00", "Stand-up"),
      makeEvent("2", "2026-09-12T10:00:00", "Design review"),
      makeEvent("3", "2026-09-12T14:00:00", "Demo call"),
    ];
    render(
      <CalendarEventsPanel mode="list" events={events} onSelectEvent={jest.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Stand-up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Design review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Demo call" })).toBeInTheDocument();
  });
});
