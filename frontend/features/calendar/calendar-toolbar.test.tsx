import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  it("opens calendar accounts from the header beside Share", () => {
    const onOpenAccounts = jest.fn();

    render(
      <CalendarToolbarPrimaryActions
        activeConnectionCount={1}
        canCreateTicket
        onOpenAccounts={onOpenAccounts}
        onOpenCreate={jest.fn()}
        onOpenCreateTicket={jest.fn()}
      />,
    );

    const shareButton = screen.getByRole("button", { name: "Share" });
    const accountsButton = screen.getByRole("button", {
      name: "Calendar accounts",
    });

    expect(shareButton.compareDocumentPosition(accountsButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    fireEvent.click(accountsButton);

    expect(onOpenAccounts).toHaveBeenCalledTimes(1);
  });
});

function renderToolbar(
  sourceFailures?: ReadonlyArray<{ key: string; label: string }>,
  overrides: {
    isHrEnabled?: boolean;
    isCrmEnabled?: boolean;
    isAttendanceEnabled?: boolean;
    canCreateTicket?: boolean;
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
      canCreateTicket={overrides.canCreateTicket ?? true}
      sourceFailures={sourceFailures}
      onPrev={jest.fn()}
      onNext={jest.fn()}
      onToday={jest.fn()}
      onViewChange={jest.fn()}
      onViewModeChange={jest.fn()}
      onOpenCreate={jest.fn()}
      onOpenCreateTicket={jest.fn()}
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

/**
 * A partially failed aggregate still renders the sources that succeeded, so a
 * calendar missing its leave events looks like a calendar with no leave. The
 * only notice used to live inside the Sources popover, which a reader has no
 * reason to open. `getByText` here runs with no popover opened on purpose.
 */
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

describe("CalendarToolbarPrimaryActions — canCreateTicket gate", () => {
  it("shows Add ticket due date when canCreateTicket is true", async () => {
    render(
      <CalendarToolbarPrimaryActions
        activeConnectionCount={0}
        canCreateTicket
        onOpenAccounts={jest.fn()}
        onOpenCreate={jest.fn()}
        onOpenCreateTicket={jest.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Add to calendar" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /Add ticket due date/i })).toBeInTheDocument();
    });
  });

  it("hides Add ticket due date when canCreateTicket is false", async () => {
    render(
      <CalendarToolbarPrimaryActions
        activeConnectionCount={0}
        canCreateTicket={false}
        onOpenAccounts={jest.fn()}
        onOpenCreate={jest.fn()}
        onOpenCreateTicket={jest.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Add to calendar" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /Add event/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("menuitem", { name: /Add ticket due date/i })).toBeNull();
  });
});
