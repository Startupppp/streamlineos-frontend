import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useRouter, usePathname } from "next/navigation";
import { useCan } from "@/hooks/api/access";
import { CommandPaletteDialogBody } from "@/components/layout/command-palette-dialog";
import {
  DirtyStateProvider,
  useRegisterDirtyState,
} from "@/components/shared/dirty-state-context";

const push = jest.fn();

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

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock(
  "@/components/command-palette/hooks/use-global-search",
  () => ({
    useGlobalSearch: () => ({ results: [], isSearching: false }),
  }),
);

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

jest.mock("@/components/layout/sidebar/sidebar-nav-items", () => ({
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

const mockedUseCan = jest.mocked(useCan);
const mockedUseRouter = jest.mocked(useRouter);
const mockedUsePathname = jest.mocked(usePathname);

function DirtySurface({ isDirty }: { isDirty: boolean }) {
  useRegisterDirtyState(isDirty);
  return null;
}

function renderWithDirtyState(isDirty: boolean) {
  return render(
    <DirtyStateProvider>
      <DirtySurface isDirty={isDirty} />
      <CommandPaletteDialogBody />
    </DirtyStateProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
  mockedUseCan.mockReturnValue(false);
  mockedUseRouter.mockReturnValue({
    push,
  } as unknown as ReturnType<typeof useRouter>);
  mockedUsePathname.mockReturnValue("/build/42");
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("BSN-04-014 command-palette navigation honours the unsaved-work guard", () => {
  test("navigates immediately when no Build surface is dirty", () => {
    renderWithDirtyState(false);

    fireEvent.click(screen.getByText("Backlog"));

    expect(push).toHaveBeenCalledWith("/build/42/backlog");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("blocks navigation and shows the unsaved-changes dialog when a Build surface is dirty", () => {
    renderWithDirtyState(true);

    fireEvent.click(screen.getByText("Backlog"));

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  test("navigates to the requested href after the user discards changes", () => {
    renderWithDirtyState(true);

    fireEvent.click(screen.getByText("Backlog"));
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(push).toHaveBeenCalledWith("/build/42/backlog");
    expect(push).toHaveBeenCalledTimes(1);
  });

  test("does not navigate when the user chooses to keep editing", () => {
    renderWithDirtyState(true);

    fireEvent.click(screen.getByText("Backlog"));
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
