import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { CyclesPage } from "./cycles-page";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { ApiError } from "@/lib/api-envelope";

const mockReplace = jest.fn();
const mockSearchParamsContainer = { current: new URLSearchParams() };

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => "/build/1/cycles",
  useSearchParams: () => mockSearchParamsContainer.current,
}));

jest.mock("@/hooks/api/build/cycles", () => ({
  useCyclePage: jest.fn(),
  useCreateCycle: jest.fn(),
  useUpdateCycle: jest.fn(),
  useDeleteCycle: jest.fn(),
  useCycles: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/hooks/api/build/tickets", () => ({
  useProjectBoardTickets: jest.fn(() => ({ data: [] })),
  useBulkUpdateTickets: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: jest.fn(() => ({ data: null })),
}));

jest.mock("@/hooks/api/build/reports", () => ({
  useVelocityReport: jest.fn(() => ({ data: undefined, isLoading: false, isError: false })),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
}));

jest.mock("@/lib/date-constraints", () => ({
  clearEndIfInvalid: jest.fn((_, end) => end),
  planningStartPickerProps: jest.fn(() => ({ fromDate: undefined, fromYear: 2020, toYear: 2030 })),
  planningEndPickerProps: jest.fn(() => ({ fromDate: undefined, fromYear: 2020, toYear: 2030 })),
}));

jest.mock("@/lib/date-refinements", () => ({
  refineDateOrder: jest.fn(),
  refineNotBeforeToday: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn().mockReturnValue(true),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, actions, filters }: { children: React.ReactNode; title?: string; actions?: React.ReactNode; filters?: React.ReactNode }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {actions}
      {filters}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => (
    <button type="button" onClick={onSelect}>{children}</button>
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ open, title, confirmLabel, onConfirm }: {
    open: boolean;
    title: React.ReactNode;
    confirmLabel?: string;
    onConfirm: () => void;
  }) => open ? (
    <div role="dialog">
      <h2>{title}</h2>
      <button type="button" onClick={onConfirm}>{confirmLabel}</button>
    </div>
  ) : null,
}));

jest.mock("./cycle-form-sheet", () => ({
  CycleFormSheet: ({ open, cycle }: { open: boolean; cycle?: { name: string } | null }) => open ? (
    <div data-testid="cycle-form-sheet">{cycle ? `Editing ${cycle.name}` : "Creating cycle"}</div>
  ) : null,
}));

jest.mock("./cycle-planning-sheet", () => ({
  CyclePlanningSheet: () => null,
}));

jest.mock("./cycle-completion-sheet", () => ({
  CycleCompletionSheet: ({ cycle, onConfirm }: { cycle: { id: number } | null; onConfirm: (cycleId: number | null) => void }) => cycle ? (
    <div role="dialog">
      <h2>Complete cycle?</h2>
      <button type="button" onClick={() => onConfirm(null)}>Complete</button>
    </div>
  ) : null,
}));

jest.mock("./cycle-velocity-panel", () => ({
  CycleVelocityPanel: () => <div data-testid="cycle-velocity-panel" />,
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description, error }: { description?: string; error?: unknown }) => (
    <div data-testid="error-state">
      {description}
      <span data-testid="error-reference">
        {jest.requireActual("@/lib/api-envelope").getCorrelationId(error) ?? ""}
      </span>
    </div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: ({ onClearAll }: { onClearAll: () => void }) => (
    <div data-testid="build-list-toolbar">
      <button type="button" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  ),
}));

jest.mock("@/hooks/common/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({ ref: _ref, ...props }: React.ComponentPropsWithRef<"span">) => <span {...props} />,
  ChevronDownIcon: ({ ref: _ref, ...props }: React.ComponentPropsWithRef<"span">) => <span {...props} />,
  ChevronRightIcon: ({ ref: _ref, ...props }: React.ComponentPropsWithRef<"span">) => <span {...props} />,
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children, isPending: _p, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { isPending?: boolean }) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: () => <input data-testid="date-picker" />,
}));

import { useCyclePage, useCreateCycle, useDeleteCycle, useUpdateCycle } from "@/hooks/api/build/cycles";
import { useCan, useAccess } from "@/hooks/api/access";
import { useOnlineStatus } from "@/hooks/common/use-online-status";

const mockUseCyclePage = useCyclePage as jest.Mock;
const mockUseCreateCycle = useCreateCycle as jest.Mock;
const mockUseUpdateCycle = useUpdateCycle as jest.Mock;
const mockUseDeleteCycle = useDeleteCycle as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildListKeyboard = useBuildListKeyboard as jest.Mock;
const mockUseOnlineStatus = useOnlineStatus as jest.Mock;
const mockUpdateMutate = jest.fn();
const mockDeleteMutate = jest.fn();

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:cycles:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function baseQueryResult(
  overrides: {
    data?: unknown[];
    hasMore?: boolean;
    nextCursor?: string | null;
    [key: string]: unknown;
  } = {},
) {
  const { data, hasMore = false, nextCursor = null, ...rest } = overrides;
  return {
    data:
      data === undefined
        ? undefined
        : { data, pagination: { limit: 25, hasMore, nextCursor } },
    isLoading: false,
    isError: false,
    error: undefined,
    dataUpdatedAt: 0,
    refetch: jest.fn(),
    ...rest,
  };
}

beforeEach(() => {
  mockReplace.mockClear();
  mockSearchParamsContainer.current = new URLSearchParams();
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [] }));
  mockUseCreateCycle.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateCycle.mockReturnValue({ mutate: mockUpdateMutate, isPending: false });
  mockUseDeleteCycle.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
  mockUseOnlineStatus.mockReturnValue(true);
  mockUpdateMutate.mockClear();
  mockDeleteMutate.mockClear();
  mockUseCyclePage.mockClear();
});

it("renders NoPermissionState when build:cycles:view is denied instead of empty state", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseCyclePage.mockReturnValue(baseQueryResult());
  render(<CyclesPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("shows actual query error message on failure instead of hardcoded text", () => {
  mockUseCyclePage.mockReturnValue(
    baseQueryResult({ isError: true, error: new Error("Build module is not enabled for this project") }),
  );
  render(<CyclesPage projectId={1} />);
  const errorEl = screen.getByTestId("error-state");
  expect(errorEl.textContent).toContain("Build module is not enabled");
});

it("shows the skeleton, not a denial, while the access snapshot is still in flight, because useCan answers false before it lands", () => {
  mockUseAccess.mockReturnValue({ data: undefined, isLoading: true });
  mockUseCyclePage.mockReturnValue(baseQueryResult());
  render(<CyclesPage projectId={1} />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("offers the upgrade path the backend sent with a 402 rather than a generic failure", () => {
  mockUseCyclePage.mockReturnValue(
    baseQueryResult({
      isError: true,
      error: new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", {
        moduleKey: "build",
        reason: "not-in-plan",
        upgradePath: "/settings/billing",
      }),
    }),
  );
  render(<CyclesPage projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

describe("CyclesPage — the completed disclosure is shareable, not local component state", () => {
  const COMPLETED_CYCLE = {
    id: 9,
    name: "Closed cycle",
    status: "completed",
    startDate: "2026-01-01",
    endDate: "2026-01-14",
    progress: 100,
    completedItems: 4,
    totalItems: 4,
  };

  it("keeps completed cycles collapsed when the URL does not ask for them", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [COMPLETED_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByText("Completed (1)")).toBeDefined();
    expect(screen.queryByText("Closed cycle")).toBeNull();
  });

  it("expands completed cycles from completed=1 so the disclosure survives a reload or a shared link", () => {
    mockSearchParamsContainer.current = new URLSearchParams("completed=1");
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [COMPLETED_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByText("Closed cycle")).toBeDefined();
  });

  it("writes the disclosure to the URL instead of mutating component state", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [COMPLETED_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    screen.getByText("Completed (1)").click();
    expect(mockReplace).toHaveBeenCalledWith("/build/1/cycles?completed=1", {
      scroll: false,
    });
  });

  it("can still be collapsed while the status filter is completed, because a disclosure forced open by the filter would otherwise be a control that does nothing when clicked", () => {
    mockSearchParamsContainer.current = new URLSearchParams("status=completed");
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [COMPLETED_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    screen.getByText("Completed (1)").click();
    expect(mockReplace).toHaveBeenCalledWith(
      "/build/1/cycles?status=completed&completed=0",
      { scroll: false },
    );
  });

  it("honours an explicit completed=0 over the status filter so a deliberate collapse survives a reload or a shared link", () => {
    mockSearchParamsContainer.current = new URLSearchParams(
      "status=completed&completed=0",
    );
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [COMPLETED_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByText("Completed (1)")).toBeDefined();
    expect(screen.queryByText("Closed cycle")).toBeNull();
  });
});

describe("CyclesPage — cycle lifecycle actions", () => {
  const ACTIVE_CYCLE = {
    id: 4,
    name: "Current cycle",
    status: "active",
    version: 3,
    startDate: "2026-09-01",
    endDate: "2026-09-14",
    progress: 50,
    completedItems: 2,
    totalItems: 4,
  };

  it("opens the edit sheet from the cycle action menu", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [ACTIVE_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByTestId("cycle-form-sheet")).toHaveTextContent("Editing Current cycle");
  });

  it("completes an active cycle through a confirmation", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [ACTIVE_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    expect(screen.getByRole("heading", { name: "Complete cycle?" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Complete" }));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { projectId: 1, cycleId: 4, version: 3, status: "completed" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("reopens a completed cycle from the expanded completed section", () => {
    mockSearchParamsContainer.current = new URLSearchParams("completed=1");
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [{ ...ACTIVE_CYCLE, status: "completed" }] }));
    render(<CyclesPage projectId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Reopen" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reopen" }));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { projectId: 1, cycleId: 4, version: 3, status: "active" },
      expect.any(Object),
    );
  });

  it("deletes a cycle only after confirmation", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [ACTIVE_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(mockDeleteMutate).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    expect(mockDeleteMutate).toHaveBeenCalledWith(
      { projectId: 1, cycleId: 4 },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("does not render mutation controls without manage permission", () => {
    mockUseCan.mockReturnValue(false);
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [ACTIVE_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});

describe("CyclesPage — q search filter narrows displayed cycles", () => {
  const CYCLE_A = { id: 1, name: "Alpha sprint", status: "active" as const, startDate: "2026-09-01", endDate: "2026-09-14", progress: 50, completedItems: 2, totalItems: 4 };
  const CYCLE_B = { id: 2, name: "Beta sprint", status: "draft" as const, startDate: "2026-10-01", endDate: "2026-10-14", progress: 0, completedItems: 0, totalItems: 0 };

  it("renders both cycles when no search term is set", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [CYCLE_A, CYCLE_B] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByText("Alpha sprint")).toBeInTheDocument();
    expect(screen.getByText("Beta sprint")).toBeInTheDocument();
  });

  it("passes q filter to useCyclePage so the DB narrows results server-side instead of the client filtering a full unbounded list", () => {
    mockSearchParamsContainer.current = new URLSearchParams("q=Alpha");
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [CYCLE_A] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByText("Alpha sprint")).toBeInTheDocument();
    expect(screen.queryByText("Beta sprint")).not.toBeInTheDocument();
    expect(mockUseCyclePage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ q: "Alpha" }),
    );
  });

  it("shows the BuildListToolbar so the search field is reachable via keyboard", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByTestId("build-list-toolbar")).toBeInTheDocument();
  });

  it("passes status filter to useCyclePage so the DB filters by status server-side", () => {
    mockSearchParamsContainer.current = new URLSearchParams("status=active");
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [CYCLE_A] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByText("Alpha sprint")).toBeInTheDocument();
    expect(screen.queryByText("Beta sprint")).not.toBeInTheDocument();
    expect(mockUseCyclePage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: "active" }),
    );
  });

  it("shows completed cycles immediately when status=completed is the filter so the user sees filtered results without a second click on the disclosure", () => {
    mockSearchParamsContainer.current = new URLSearchParams("status=completed");
    const COMPLETED_CYCLE = { id: 10, name: "Q3 Sprint", status: "completed" as const, startDate: "2026-07-01", endDate: "2026-09-30", progress: 100, completedItems: 5, totalItems: 5 };
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [COMPLETED_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByText("Q3 Sprint")).toBeInTheDocument();
    expect(mockUseCyclePage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: "completed" }),
    );
  });
});

describe("CyclesPage — from/to date range filters narrow displayed cycles", () => {
  const EARLY = { id: 1, name: "Early sprint", version: 1, status: "active" as const, startDate: "2026-08-01", endDate: "2026-08-14", progress: 80, completedItems: 4, totalItems: 5 };
  const RECENT = { id: 2, name: "Recent sprint", version: 1, status: "draft" as const, startDate: "2026-09-15", endDate: "2026-09-28", progress: 0, completedItems: 0, totalItems: 0 };

  it("passes from filter to useCyclePage so the DB excludes cycles ending before the window boundary", () => {
    mockSearchParamsContainer.current = new URLSearchParams("from=2026-09-01");
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [RECENT] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByText("Recent sprint")).toBeInTheDocument();
    expect(screen.queryByText("Early sprint")).not.toBeInTheDocument();
    expect(mockUseCyclePage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ from: "2026-09-01" }),
    );
  });

  it("passes to filter to useCyclePage so the DB excludes cycles starting after the window boundary", () => {
    mockSearchParamsContainer.current = new URLSearchParams("to=2026-08-31");
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [EARLY] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByText("Early sprint")).toBeInTheDocument();
    expect(screen.queryByText("Recent sprint")).not.toBeInTheDocument();
    expect(mockUseCyclePage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ to: "2026-08-31" }),
    );
  });

  it("passes both from and to filters to useCyclePage and renders all cycles the server returns within the window", () => {
    mockSearchParamsContainer.current = new URLSearchParams("from=2026-08-10&to=2026-09-20");
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [EARLY, RECENT] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByText("Early sprint")).toBeInTheDocument();
    expect(screen.getByText("Recent sprint")).toBeInTheDocument();
    expect(mockUseCyclePage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ from: "2026-08-10", to: "2026-09-20" }),
    );
  });
});

describe("CyclesPage — the c and e shortcuts have a real target", () => {
  const CYCLE = { id: 4, name: "Focused sprint", version: 1, status: "active" as const, startDate: "2026-09-01", endDate: "2026-09-14", progress: 0, completedItems: 0, totalItems: 0 };

  it("passes onCreate to useBuildListKeyboard so c opens the create sheet when cycles can be managed", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [CYCLE] }));
    render(<CyclesPage projectId={1} />);
    const args = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(typeof args?.onCreate).toBe("function");
  });

  it("passes no onCreate when build:cycles:manage is denied, so c cannot open a sheet the caller may not submit", () => {
    mockUseCan.mockReturnValue(false);
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [CYCLE] }));
    render(<CyclesPage projectId={1} />);
    const args = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(args?.onCreate).toBeUndefined();
  });

  it("opens the edit sheet on the focused cycle when onEdit fires, instead of the previous no-op handler", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [CYCLE] }));
    render(<CyclesPage projectId={1} />);
    const args = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(screen.queryByTestId("cycle-form-sheet")).not.toBeInTheDocument();
    act(() => {
      args?.onEdit?.(0);
    });
    expect(screen.getByTestId("cycle-form-sheet").textContent).toBe("Editing Focused sprint");
  });

  it("opens the edit sheet on the focused cycle when Enter fires, so onOpen is not a no-op either", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [CYCLE] }));
    render(<CyclesPage projectId={1} />);
    const args = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    act(() => {
      args?.onOpen?.(0);
    });
    expect(screen.getByTestId("cycle-form-sheet").textContent).toBe("Editing Focused sprint");
  });
});

describe("CyclesPage — the empty state tells a first run apart from a filtered no-result", () => {
  const DRAFT = { id: 7, name: "Draft sprint", version: 1, status: "draft" as const, startDate: "2026-09-01", endDate: "2026-09-14", progress: 0, completedItems: 0, totalItems: 0 };

  it("offers first-run copy when nothing is filtered and the project has no cycles", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByTestId("empty-state").textContent).toBe("No cycles yet");
  });

  it("says the filters excluded everything when the server returns no cycles for the active status filter", () => {
    mockSearchParamsContainer.current = new URLSearchParams("status=completed");
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByTestId("empty-state").textContent).toBe("No cycles match your filters");
  });
});

describe("CyclesPage — offline state", () => {
  it("renders the offline state instead of EmptyState when the browser is offline and no cycles are loaded", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByTestId("offline-state")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("renders cycles normally and not the offline state when the browser is online", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    const DRAFT = { id: 7, name: "Draft sprint", version: 1, status: "draft" as const, startDate: "2026-09-01", endDate: "2026-09-14", progress: 0, completedItems: 0, totalItems: 0 };
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [DRAFT] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.queryByTestId("offline-state")).not.toBeInTheDocument();
    expect(screen.getByText("Draft sprint")).toBeInTheDocument();
  });
});

describe("CyclesPage — the cursor is in the URL, so a page is shareable and the list is bounded", () => {
  const PAGE_CYCLE = {
    id: 9,
    name: "Cycle 9",
    status: "active" as const,
    version: 1,
    startDate: "2026-01-01",
    endDate: "2026-01-14",
    capacity: null,
    goal: null,
    description: null,
    ticketCount: 0,
    completedCount: 0,
  };

  it("asks the server for a bounded page and forwards the URL cursor, so the list cannot grow without bound", () => {
    mockSearchParamsContainer.current = new URLSearchParams("cursor=abc");
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [PAGE_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    expect(mockUseCyclePage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ cursor: "abc", limit: 25 }),
    );
  });

  it("writes the server's next cursor to the URL so the next page is a shareable link", () => {
    mockUseCyclePage.mockReturnValue(
      baseQueryResult({ data: [PAGE_CYCLE], hasMore: true, nextCursor: "next-token" }),
    );
    render(<CyclesPage projectId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(mockReplace).toHaveBeenCalledWith("/build/1/cycles?cursor=next-token", {
      scroll: false,
    });
  });

  it("disables Next when the server says there is no further page, so the control never promises a page that does not exist", () => {
    mockUseCyclePage.mockReturnValue(
      baseQueryResult({ data: [PAGE_CYCLE], hasMore: false, nextCursor: null }),
    );
    render(<CyclesPage projectId={1} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("offers no Previous on a deep-linked cursor, because the page before it was never visited here", () => {
    mockSearchParamsContainer.current = new URLSearchParams("cursor=abc");
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [PAGE_CYCLE], hasMore: true, nextCursor: "n" }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });

  it("returns to the cursor it came from when Previous is pressed after a Next", () => {
    mockSearchParamsContainer.current = new URLSearchParams("cursor=first");
    mockUseCyclePage.mockReturnValue(
      baseQueryResult({ data: [PAGE_CYCLE], hasMore: true, nextCursor: "second" }),
    );
    render(<CyclesPage projectId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    const previous = screen.getByRole("button", { name: "Previous page" });
    expect(previous).not.toBeDisabled();
    fireEvent.click(previous);
    expect(mockReplace).toHaveBeenLastCalledWith("/build/1/cycles?cursor=first", {
      scroll: false,
    });
  });

  it("drops the cursor when a filter changes, so page two of one filter is never read as page two of another", () => {
    mockSearchParamsContainer.current = new URLSearchParams("cursor=abc&status=active");
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [PAGE_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    fireEvent.click(screen.getByText("Clear all"));
    const lastCall = mockReplace.mock.calls[mockReplace.mock.calls.length - 1];
    expect(String(lastCall[0])).not.toContain("cursor");
  });
});

describe("CyclesPage — offline freshness", () => {
  const STALE_CYCLE = {
    id: 11,
    name: "Stale cycle",
    status: "active" as const,
    version: 1,
    startDate: "2026-01-01",
    endDate: "2026-01-14",
    capacity: null,
    goal: null,
    description: null,
    ticketCount: 0,
    completedCount: 0,
  };

  it("dates the loaded cycles while offline, because a stale list without a timestamp cannot be judged", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockUseCyclePage.mockReturnValue(
      baseQueryResult({ data: [STALE_CYCLE], dataUpdatedAt: Date.now() - 10 * 60 * 1000 }),
    );
    render(<CyclesPage projectId={1} />);
    expect(screen.getByTestId("offline-banner-freshness")).toHaveTextContent(
      /last updated .*10 minutes ago/i,
    );
  });

  it("shows no offline banner over the list while online, so the notice is not always on", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    mockUseCyclePage.mockReturnValue(
      baseQueryResult({ data: [STALE_CYCLE], dataUpdatedAt: Date.now() }),
    );
    render(<CyclesPage projectId={1} />);
    expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();
  });

  it("dates the empty offline state too, so a reader can tell a stale empty list from a fresh one", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockUseCyclePage.mockReturnValue(
      baseQueryResult({ data: [], dataUpdatedAt: Date.now() - 3 * 60 * 1000 }),
    );
    render(<CyclesPage projectId={1} />);
    expect(screen.getByTestId("offline-freshness")).toHaveTextContent(
      /last updated .*3 minutes ago/i,
    );
  });
});

describe("CyclesPage — the ? shortcut has a target", () => {
  it("opens the shortcut help dialog when ? fires, instead of passing no handler at all", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [] }));
    render(<CyclesPage projectId={1} />);
    const calls = mockUseBuildListKeyboard.mock.calls;
    const options = calls[calls.length - 1][0];
    expect(typeof options.onShortcutHelp).toBe("function");
    act(() => {
      options.onShortcutHelp();
    });
    expect(screen.getByRole("dialog")).toHaveTextContent(/shortcut/i);
  });

  it("keeps the shortcut help dialog closed until ? fires, so it is not always mounted open", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("CyclesPage — the failure surface carries the request id and the velocity panel is on the page", () => {
  const ONE_CYCLE = {
    id: 21,
    name: "Cycle 21",
    status: "active" as const,
    version: 1,
    startDate: "2026-01-01",
    endDate: "2026-01-14",
    capacity: null,
    goal: null,
    description: null,
  };

  it("hands the failing error down so the request id reaches the reader rather than only the message", () => {
    mockUseCyclePage.mockReturnValue(
      baseQueryResult({
        isError: true,
        error: new ApiError("Cycles unavailable", 500, "INTERNAL", {
          correlationId: "req-cycles-42",
        }),
      }),
    );
    render(<CyclesPage projectId={1} />);
    expect(screen.getByTestId("error-reference")).toHaveTextContent("req-cycles-42");
  });

  it("shows no request id for a failure that carries none, so the reference is never invented", () => {
    mockUseCyclePage.mockReturnValue(
      baseQueryResult({ isError: true, error: new TypeError("Failed to fetch") }),
    );
    render(<CyclesPage projectId={1} />);
    expect(screen.getByTestId("error-reference")).toHaveTextContent("");
  });

  it("renders the velocity panel with the list, because velocity is one of the page's core fields", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [ONE_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByTestId("cycle-velocity-panel")).toBeInTheDocument();
  });

  it("offers no selection control on a cycle row, because the primary record is never selected here", () => {
    mockUseCyclePage.mockReturnValue(baseQueryResult({ data: [ONE_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
