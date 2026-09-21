import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useCan } from "@/hooks/api/access";
import { useRouter, usePathname } from "next/navigation";
import { CommandPaletteDialogBody } from "../command-palette-dialog";

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: { isOrgOwner: false, scopes: [] } }),
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/access/org-modules", () => ({
  useEnabledModules: () => [],
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: { lockedModules: [] } }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useNavigationLeave: () => (fn: () => void) => fn(),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/components/command-palette/hooks/use-global-search", () => ({
  useGlobalSearch: () => ({ results: [], isSearching: false }),
}));

jest.mock("@/components/command-palette", () => ({
  useCommandPalette: () => ({
    paletteOpen: true,
    setPaletteOpen: jest.fn(),
    openCreateTicket: jest.fn(),
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock("../sidebar/sidebar-nav-items", () => ({
  getNavGroupsForUser: () => [],
  flattenNavRoutes: () => [],
}));

jest.mock("lucide-react", () => {
  const Icon = ({ className }: { className?: string }) => (
    <svg aria-hidden="true" className={className} />
  );
  return {
    Contact2: Icon,
    Handshake: Icon,
    UserCheck: Icon,
    Briefcase: Icon,
    Ticket: Icon,
    Search: Icon,
    Loader2: Icon,
    ArrowRight: Icon,
    Plus: Icon,
    LayoutDashboard: Icon,
    Kanban: Icon,
    ListTodo: Icon,
    RefreshCw: Icon,
    BarChart2: Icon,
    Star: Icon,
  };
});

describe("CommandPaletteDialogBody — Create ticket permission gate", () => {
  beforeEach(() => {
    (useCan as jest.Mock).mockReturnValue(false);
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    (usePathname as jest.Mock).mockReturnValue("/");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows Create ticket when the user has build:tickets:create", () => {
    (useCan as jest.Mock).mockImplementation(
      (key: string) => key === "build:tickets:create",
    );
    render(<CommandPaletteDialogBody />);
    expect(screen.getByText("Create ticket")).toBeInTheDocument();
  });

  it("hides Create ticket while keeping palette open for users without build:tickets:create", () => {
    (useCan as jest.Mock).mockReturnValue(false);
    render(<CommandPaletteDialogBody />);
    expect(screen.getByText("All Projects")).toBeInTheDocument();
    expect(screen.queryByText("Create ticket")).not.toBeInTheDocument();
  });
});

describe("CommandPaletteDialogBody — project-scoped commands", () => {
  let mockPush: jest.Mock;

  beforeEach(() => {
    mockPush = jest.fn();
    (useCan as jest.MockedFunction<typeof useCan>).mockReturnValue(false);
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (usePathname as jest.Mock).mockReturnValue("/build/42");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders all five project-scoped command labels on a project page", () => {
    render(<CommandPaletteDialogBody />);
    expect(screen.getByText("Board")).toBeInTheDocument();
    expect(screen.getByText("Backlog")).toBeInTheDocument();
    expect(screen.getByText("Cycles")).toBeInTheDocument();
    expect(screen.getByText("My Tickets")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });

  it("pushes /build/42/backlog when Backlog is selected", () => {
    render(<CommandPaletteDialogBody />);
    fireEvent.click(screen.getByText("Backlog"));
    expect(mockPush).toHaveBeenCalledWith("/build/42/backlog");
  });
});
