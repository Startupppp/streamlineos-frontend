import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BuildNavDestination } from "@/lib/build/nav/build-nav-destination";
import { BuildMoreToolsMenu } from "./build-more-tools-menu";

jest.mock("@animateicons/react/lucide", () => ({
  EllipsisIcon: () => <span data-testid="ellipsis-icon" />,
}));

jest.mock("@/components/layout/sidebar/sidebar-animated-nav", () => ({
  SidebarAnimatedNavIcon: () => <span data-testid="nav-icon" />,
  useAnimatedNavIconHover: () => ({
    iconRef: { current: null },
    animatedNavHoverHandlers: { onMouseEnter: jest.fn(), onMouseLeave: jest.fn() },
  }),
}));

const mockIcon = () => <span data-testid="tool-icon" />;

function makeTool(
  id: string,
  label: string,
  href = `/build/${id}`,
): BuildNavDestination {
  return {
    id,
    label,
    href,
    icon: mockIcon,
    requiredPermission: "build:view",
    exact: true,
  };
}

const TOOL_ANALYTICS = makeTool("analytics", "Analytics");
const TOOL_REPORTS = makeTool("reports", "Reports");
const TOOL_TIMESHEETS = makeTool("timesheets", "Timesheets");

const DEFAULT_PROPS = {
  tools: [TOOL_ANALYTICS, TOOL_REPORTS, TOOL_TIMESHEETS],
  pathname: "/build/all-work",
  view: null,
  isCollapsed: false,
  isPinned: (_id: string) => false,
  canPinMore: true,
  onTogglePin: jest.fn(),
  onNavigate: jest.fn(),
};

function renderMenu(overrides: Partial<typeof DEFAULT_PROPS> = {}) {
  return render(<BuildMoreToolsMenu {...DEFAULT_PROPS} {...overrides} />);
}

async function openMenu(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "More Build tools" }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BSN-03-034 — filtered state", () => {
  test("matching search query shows only the tools whose label contains the query", async () => {
    renderMenu();
    await openMenu();

    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "Ana" } });

    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.queryByText("Reports")).not.toBeInTheDocument();
    expect(screen.queryByText("Timesheets")).not.toBeInTheDocument();
  });

  test("search is case-insensitive", async () => {
    renderMenu();
    await openMenu();

    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "REPORTS" } });

    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
  });
});

describe("BSN-03-034 — empty state", () => {
  test("a query with no matches shows the no-results message", async () => {
    renderMenu();
    await openMenu();

    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "xyznotfound" } });

    expect(screen.getByText("No matching tools")).toBeInTheDocument();
    expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
  });
});

describe("BSN-03-034 — disabled state (unpinned tool at max-pin limit)", () => {
  test("all pin buttons for unpinned tools are disabled when canPinMore is false", async () => {
    renderMenu({ canPinMore: false, isPinned: () => false });
    await openMenu();

    const limitButtons = screen.getAllByRole("button", {
      name: "Pin limit of 3 reached",
    });
    expect(limitButtons.length).toBe(3);
    for (const btn of limitButtons) {
      expect(btn).toBeDisabled();
    }
  });

  test("pin button tooltip describes the limit when canPinMore is false", async () => {
    renderMenu({ canPinMore: false, isPinned: () => false });
    await openMenu();

    const pinButtons = screen.getAllByTitle("Pin limit of 3 reached");
    expect(pinButtons.length).toBeGreaterThan(0);
  });
});

describe("BSN-03-034 — maximum-pin state", () => {
  test("footer shows the pin limit hint", async () => {
    renderMenu();
    await openMenu();

    expect(screen.getByText(/Pin up to 3 tools/)).toBeInTheDocument();
  });

  test("a pinned tool's unpin button is enabled even when canPinMore is false", async () => {
    renderMenu({
      canPinMore: false,
      isPinned: (id) => id === "analytics",
    });
    await openMenu();

    const unpinButton = screen.getByRole("button", { name: "Unpin Analytics" });
    expect(unpinButton).not.toBeDisabled();
  });
});

describe("BSN-03-034 — revoked state (unauthorized tool absent from list)", () => {
  test("a tool not in the tools array is not rendered even if isPinned returns true for its id", async () => {
    renderMenu({
      tools: [TOOL_REPORTS, TOOL_TIMESHEETS],
      isPinned: (id) => id === "analytics",
    });
    await openMenu();

    expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
  });
});

describe("BSN-03-033 — active state keyboard accessibility", () => {
  test("the active tool's link carries aria-current=page", async () => {
    renderMenu({ pathname: "/build/analytics" });
    await openMenu();

    const analyticsLink = screen.getByRole("link", { name: /Analytics/ });
    expect(analyticsLink).toHaveAttribute("aria-current", "page");
  });

  test("inactive tools do not carry aria-current", async () => {
    renderMenu({ pathname: "/build/analytics" });
    await openMenu();

    const reportsLink = screen.getByRole("link", { name: /Reports/ });
    expect(reportsLink).not.toHaveAttribute("aria-current");
  });
});

describe("BSN-03-033 — pin/unpin keyboard accessibility", () => {
  test("pin button has an accessible aria-label describing the action", async () => {
    renderMenu({ canPinMore: true, isPinned: () => false });
    await openMenu();

    const pinButton = screen.getByRole("button", { name: "Pin Analytics" });
    expect(pinButton).toBeInTheDocument();
    expect(pinButton).toHaveAttribute("type", "button");
  });

  test("unpin button has an accessible aria-label for a pinned tool", async () => {
    renderMenu({ isPinned: (id) => id === "reports" });
    await openMenu();

    const unpinButton = screen.getByRole("button", { name: "Unpin Reports" });
    expect(unpinButton).toBeInTheDocument();
  });

  test("pressing Enter on the pin button fires the toggle handler", async () => {
    const user = userEvent.setup();
    const handleTogglePin = jest.fn();
    renderMenu({ canPinMore: true, isPinned: () => false, onTogglePin: handleTogglePin });
    await openMenu();

    const pinButton = screen.getByRole("button", { name: "Pin Analytics" });
    pinButton.focus();
    await user.keyboard("{Enter}");

    expect(handleTogglePin).toHaveBeenCalledWith("analytics");
  });
});

describe("BSN-03-033 — search accessibility", () => {
  test("search input is accessible as a searchbox role", async () => {
    renderMenu();
    await openMenu();

    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  test("typing in the search box is keyboard-driven and narrows results", async () => {
    const user = userEvent.setup();
    renderMenu();
    await openMenu();

    const search = screen.getByRole("searchbox");
    await user.type(search, "Time");

    expect(screen.getByText("Timesheets")).toBeInTheDocument();
    expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
  });
});

describe("BSN-03-034 — returns null with an empty tools list", () => {
  test("component renders nothing when tools list is empty", () => {
    const { container } = renderMenu({ tools: [] });
    expect(container.firstChild).toBeNull();
  });
});
