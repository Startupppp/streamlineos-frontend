import { render, screen } from "@testing-library/react";
import React from "react";
import { CalendarMonthYearPicker } from "./calendar-month-year-picker";
import { CalendarToolbar } from "./calendar-toolbar";

jest.mock("./calendar-source-panel", () => ({
  CalendarSourcePanel: () => <div data-testid="source-panel" />,
  SourceFailureBanner: ({
    failures,
  }: {
    failures: ReadonlyArray<{ key: string; label: string }>;
  }) =>
    failures.length === 0 ? null : (
      <div role="status">{failures.map((f) => f.label).join(", ")}</div>
    ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

const toolbarHandlers = {
  onPrev: jest.fn(),
  onNext: jest.fn(),
  onToday: jest.fn(),
  onViewChange: jest.fn(),
  onViewModeChange: jest.fn(),
  onOpenCreate: jest.fn(),
  onOpenCreateTicket: jest.fn(),
  onToggleHrEvents: jest.fn(),
  onToggleCrmEvents: jest.fn(),
  onToggleAttendanceEvents: jest.fn(),
};

function renderToolbar(view: "day" | "week" | "month") {
  return render(
    <CalendarToolbar
      view={view}
      viewMode="calendar"
      hrEventsVisible={false}
      crmEventsVisible
      attendanceEventsVisible={false}
      {...toolbarHandlers}
    />,
  );
}

describe("Calendar date navigation is announced to assistive technology", () => {
  it("names the period the previous/next controls move by, so they are not a bare 'Previous'", () => {
    const { unmount } = renderToolbar("month");
    expect(screen.getByRole("button", { name: /previous month/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next month/i })).toBeInTheDocument();
    unmount();

    renderToolbar("week");
    expect(screen.getByRole("button", { name: /previous week/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next week/i })).toBeInTheDocument();
  });

  it("groups the date navigation controls under a name", () => {
    renderToolbar("month");
    expect(
      screen.getByRole("group", { name: /date navigation/i }),
    ).toBeInTheDocument();
  });

  it("exposes source visibility toggles as pressed state, not a mutating label", () => {
    renderToolbar("month");
    const crm = screen.getByRole("button", { name: /crm events/i });
    expect(crm).toHaveAttribute("aria-pressed", "true");
    const hr = screen.getByRole("button", { name: /hr events/i });
    expect(hr).toHaveAttribute("aria-pressed", "false");
  });
});

describe("CalendarMonthYearPicker announces the selected period", () => {
  it("includes the current period in the trigger's accessible name", () => {
    render(
      <CalendarMonthYearPicker
        currentDate={new Date("2026-09-12T00:00:00Z")}
        title="September 2026"
        onDateChange={jest.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /September 2026/ }),
    ).toBeInTheDocument();
  });

  it("renders a polite live region carrying the current period", () => {
    const { container } = render(
      <CalendarMonthYearPicker
        currentDate={new Date("2026-09-12T00:00:00Z")}
        title="September 2026"
        onDateChange={jest.fn()}
      />,
    );
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live?.textContent).toContain("September 2026");
  });
});
