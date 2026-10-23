import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CalendarToolbar, CalendarToolbarPrimaryActions } from "./calendar-toolbar";

jest.mock("@/hooks/common/use-mobile", () => ({
  useIsMobile: () => false,
}));

jest.mock("@/hooks/api/calendar", () => ({
  useCalendarSources: jest.fn(),
  useSetCalendarSourcePreference: jest.fn(),
}));

const mockCalendar = jest.requireMock("@/hooks/api/calendar") as {
  useCalendarSources: jest.Mock;
  useSetCalendarSourcePreference: jest.Mock;
};

beforeEach(() => {
  mockCalendar.useCalendarSources.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  mockCalendar.useSetCalendarSourcePreference.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  });
});

describe("CalendarToolbarPrimaryActions", () => {
  it("opens calendar accounts from the header beside Booking pages", () => {
    const onOpenAccounts = jest.fn();
    const onOpenBookingPages = jest.fn();

    render(
      <CalendarToolbarPrimaryActions
        activeConnectionCount={1}
        onOpenAccounts={onOpenAccounts}
        onOpenBookingPages={onOpenBookingPages}
        onOpenCreate={jest.fn()}
      />,
    );

    const bookingPagesButton = screen.getByRole("button", { name: "Booking pages" });
    const accountsButton = screen.getByRole("button", {
      name: "Calendar accounts",
    });

    expect(bookingPagesButton.compareDocumentPosition(accountsButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    fireEvent.click(bookingPagesButton);
    fireEvent.click(accountsButton);

    expect(onOpenBookingPages).toHaveBeenCalledTimes(1);
    expect(onOpenAccounts).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
    expect(screen.queryByText("Copy link")).toBeNull();
    expect(screen.queryByText("Email calendar")).toBeNull();
    expect(screen.queryByText("Embed calendar")).toBeNull();
  });
});

it("places resource approvals in the existing Calendar modes when authorized", () => {
  const onOpenResourceApprovals = jest.fn();
  render(
    <CalendarToolbar
      view="month"
      viewMode="calendar"
      hrEventsVisible
      crmEventsVisible
      attendanceEventsVisible={false}
      isHrEnabled
      isCrmEnabled
      isAttendanceEnabled
      onPrev={jest.fn()}
      onNext={jest.fn()}
      onToday={jest.fn()}
      onViewChange={jest.fn()}
      onViewModeChange={jest.fn()}
      onOpenResourceApprovals={onOpenResourceApprovals}
      onOpenCreate={jest.fn()}
      onToggleHrEvents={jest.fn()}
      onToggleCrmEvents={jest.fn()}
      onToggleAttendanceEvents={jest.fn()}
      hidePrimaryActions
    />,
  );

  const modeTabs = screen.getByRole("tablist", { name: "Calendar modes" });
  const approvalTab = within(modeTabs).getByRole("tab", { name: "Resource approvals" });
  fireEvent.mouseDown(approvalTab, { button: 0 });
  expect(onOpenResourceApprovals).toHaveBeenCalledTimes(1);
});

function renderToolbar(
  sourceFailures?: ReadonlyArray<{ key: string; label: string }>,
  overrides: {
    isHrEnabled?: boolean;
    isCrmEnabled?: boolean;
    isAttendanceEnabled?: boolean;
  } = {},
) {
  render(
    <CalendarToolbar
      view="month"
      viewMode="calendar"
      hrEventsVisible
      crmEventsVisible
      attendanceEventsVisible={false}
      isHrEnabled={overrides.isHrEnabled ?? true}
      isCrmEnabled={overrides.isCrmEnabled ?? true}
      isAttendanceEnabled={overrides.isAttendanceEnabled ?? true}
      sourceFailures={sourceFailures}
      onPrev={jest.fn()}
      onNext={jest.fn()}
      onToday={jest.fn()}
      onViewChange={jest.fn()}
      onViewModeChange={jest.fn()}
      onOpenCreate={jest.fn()}
      onToggleHrEvents={jest.fn()}
      onToggleCrmEvents={jest.fn()}
      onToggleAttendanceEvents={jest.fn()}
      hidePrimaryActions
    />,
  );
}

async function openOverflowMenu() {
  const trigger = screen.getByRole("button", { name: "More calendar actions" });
  fireEvent.keyDown(trigger, { key: "Enter" });
  await waitFor(() => {
    expect(screen.getAllByRole("menuitemcheckbox").length).toBeGreaterThan(0);
  });
}

describe("CalendarToolbar — below-lg overflow menu", () => {
  it("stays a three-item filter menu, the size §13 exempts from the drawer rule", async () => {
    renderToolbar();
    await openOverflowMenu();

    expect(screen.getAllByRole("menuitemcheckbox")).toHaveLength(3);
    expect(screen.queryAllByRole("menuitem")).toHaveLength(0);
    expect(document.querySelectorAll("[data-slot='dropdown-menu-separator']")).toHaveLength(0);
  });

  it("reflects and forwards each source toggle from the overflow menu", async () => {
    renderToolbar();
    await openOverflowMenu();

    const items = screen.getAllByRole("menuitemcheckbox");
    expect(items.map((item) => item.getAttribute("aria-checked"))).toEqual([
      "false",
      "true",
      "true",
    ]);
  });
});

describe("CalendarToolbar — partial source failure", () => {
  it("names the failed source on the surface without opening the Sources popover", () => {
    renderToolbar([{ key: "hr-leaves", label: "Leaves" }]);

    expect(document.querySelector("[data-slot='popover-content']")).toBeNull();
    expect(document.querySelector("[data-slot='drawer-content']")).toBeNull();

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Some events could not be loaded: Leaves");
    expect(banner).not.toHaveTextContent("hr-leaves");
  });

  it("lists every failed source, not just the first", () => {
    renderToolbar([
      { key: "hr-leaves", label: "Leaves" },
      { key: "crm-meetings", label: "CRM meetings" },
    ]);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Some events could not be loaded: Leaves, CRM meetings",
    );
  });

  it("renders nothing when every source loaded", () => {
    renderToolbar([]);

    expect(screen.queryByRole("status")).toBeNull();
    expect(
      screen.queryByText(/some events could not be loaded/i),
    ).toBeNull();
  });
});

describe("CalendarToolbar — field control sizing", () => {
  it("leaves the view select at the h-9 field-control canon", () => {
    renderToolbar();
    const trigger = screen.getByRole("combobox", { name: "Calendar view" });
    expect(trigger.className).toContain("h-9");
    expect(trigger.className).not.toContain("h-8");
  });
});

describe("CalendarToolbar — module-disabled toggles", () => {
  it("hides the Attendance toggle when attendance module is disabled", () => {
    renderToolbar(undefined, { isAttendanceEnabled: false });
    expect(screen.queryByRole("button", { name: "Attendance events" })).toBeNull();
  });

  it("hides the HR toggle when HR module is disabled", () => {
    renderToolbar(undefined, { isHrEnabled: false });
    expect(screen.queryByRole("button", { name: "HR events" })).toBeNull();
  });

  it("hides the CRM toggle when CRM module is disabled", () => {
    renderToolbar(undefined, { isCrmEnabled: false });
    expect(screen.queryByRole("button", { name: "CRM events" })).toBeNull();
  });

  it("shows all three toggles when all modules are enabled", () => {
    renderToolbar();
    expect(screen.getByRole("button", { name: "Attendance events" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "HR events" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CRM events" })).toBeInTheDocument();
  });
});

describe("B-011 — server-driven toggle visibility", () => {
  it("hides HR, CRM and Attendance buttons when source registry returns no matching modules", () => {
    renderToolbar(undefined, {
      isHrEnabled: false,
      isCrmEnabled: false,
      isAttendanceEnabled: false,
    });

    expect(screen.queryByRole("button", { name: "Attendance events" })).toBeNull();
    expect(screen.queryByRole("button", { name: "HR events" })).toBeNull();
    expect(screen.queryByRole("button", { name: "CRM events" })).toBeNull();
  });

  it("surfaces the Build tickets source in the event sources panel when registry returns it", async () => {
    mockCalendar.useCalendarSources.mockReturnValue({
      data: [{ key: "build", label: "Build tickets", module: "build", enabled: true }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    renderToolbar(undefined, {
      isHrEnabled: false,
      isCrmEnabled: false,
      isAttendanceEnabled: false,
    });

    expect(screen.queryByRole("button", { name: "Attendance events" })).toBeNull();
    expect(screen.queryByRole("button", { name: "HR events" })).toBeNull();
    expect(screen.queryByRole("button", { name: "CRM events" })).toBeNull();

    const [sourcesButton] = screen.getAllByRole("button", { name: "Event sources" });
    fireEvent.click(sourcesButton);

    await waitFor(() => {
      expect(screen.getByText("Build tickets")).toBeInTheDocument();
    });
  });
});

describe("CalendarToolbar — controls follow the active tab", () => {
  function renderMode(viewMode: "calendar" | "list" | "history" | "my-day") {
    render(
      <CalendarToolbar
        view="week"
        viewMode={viewMode}
        hrEventsVisible
        crmEventsVisible
        attendanceEventsVisible={false}
        isHrEnabled
        isCrmEnabled
        isAttendanceEnabled
        onPrev={jest.fn()}
        onNext={jest.fn()}
        onToday={jest.fn()}
        onViewChange={jest.fn()}
        onViewModeChange={jest.fn()}
        onOpenCreate={jest.fn()}
        onToggleHrEvents={jest.fn()}
        onToggleCrmEvents={jest.fn()}
        onToggleAttendanceEvents={jest.fn()}
        onOpenCapacity={jest.fn()}
        onOpenCoach={jest.fn()}
        hidePrimaryActions
      />,
    );
  }

  it("keeps planning tools and the period on the calendar tab", () => {
    renderMode("calendar");
    expect(screen.getByRole("button", { name: "Capacity" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "My time insights" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Calendar view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
  });

  it("hides date navigation and planning tools on the list tab", () => {
    renderMode("list");
    expect(screen.queryByRole("button", { name: "Today" })).toBeNull();
    expect(screen.queryByRole("button", { name: /previous week/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Calendar view" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Capacity" })).toBeNull();
    expect(screen.queryByRole("button", { name: "My time insights" })).toBeNull();
  });

  it("hides date controls and planning tools on the history tab", () => {
    renderMode("history");
    expect(screen.queryByText("Newest to oldest")).toBeNull();
    expect(screen.queryByRole("button", { name: "Today" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Calendar view" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Capacity" })).toBeNull();
    expect(screen.queryByRole("button", { name: "My time insights" })).toBeNull();
  });

  it("keeps insights on My Day and hides date navigation", () => {
    renderMode("my-day");
    expect(screen.getByRole("button", { name: "My time insights" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Today" })).toBeNull();
    expect(screen.queryByRole("button", { name: /previous/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Capacity" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Calendar view" })).toBeNull();
  });
});

describe("CalendarToolbarPrimaryActions — Add opens an event", () => {
  it("creates a calendar event directly and does not offer a ticket", () => {
    const onOpenCreate = jest.fn();
    render(
      <CalendarToolbarPrimaryActions
        activeConnectionCount={0}
        onOpenAccounts={jest.fn()}
        onOpenBookingPages={jest.fn()}
        onOpenCreate={onOpenCreate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add to calendar" }));

    expect(onOpenCreate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menuitem", { name: /Add ticket due date/i })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: /Add event/i })).toBeNull();
  });
});
