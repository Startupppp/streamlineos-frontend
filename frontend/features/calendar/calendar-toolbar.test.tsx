import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CalendarToolbar, CalendarToolbarPrimaryActions } from "./calendar-toolbar";

jest.mock("@/hooks/common/use-mobile", () => ({
  useIsMobile: () => false,
}));

jest.mock("@/hooks/api/calendar", () => ({
  useCalendarSources: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useSetCalendarSourcePreference: () => ({ mutate: jest.fn(), isPending: false }),
}));

describe("CalendarToolbarPrimaryActions", () => {
  it("opens calendar accounts from the header beside Share", () => {
    const onOpenAccounts = jest.fn();

    render(
      <CalendarToolbarPrimaryActions
        activeConnectionCount={1}
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
) {
  render(
    <CalendarToolbar
      view="month"
      viewMode="calendar"
      hrEventsVisible
      crmEventsVisible
      attendanceEventsVisible={false}
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
