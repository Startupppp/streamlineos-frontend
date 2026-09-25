import { fireEvent, render, screen, within } from "@testing-library/react";
import { CyclesPage } from "./cycles-page";
import { ApiError } from "@/lib/api-envelope";

const mockReplace = jest.fn();
const mockSearchParamsContainer = { current: new URLSearchParams() };

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => "/build/1/cycles",
  useSearchParams: () => mockSearchParamsContainer.current,
}));

jest.mock("@/hooks/api/build", () => ({
  useCycles: jest.fn(),
  useCreateCycle: jest.fn(),
  useUpdateCycle: jest.fn(),
  useDeleteCycle: jest.fn(),
  useProjectBoardTickets: jest.fn(() => ({ data: [] })),
  useBulkUpdateTickets: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
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
  PageWrapper: ({ children, title, actions }: { children: React.ReactNode; title?: string; actions?: React.ReactNode }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {actions}
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
  CycleVelocityPanel: () => null,
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
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

import { useCycles, useCreateCycle, useDeleteCycle, useUpdateCycle } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseCycles = useCycles as jest.Mock;
const mockUseCreateCycle = useCreateCycle as jest.Mock;
const mockUseUpdateCycle = useUpdateCycle as jest.Mock;
const mockUseDeleteCycle = useDeleteCycle as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
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

function baseQueryResult(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockReplace.mockClear();
  mockSearchParamsContainer.current = new URLSearchParams();
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseCycles.mockReturnValue(baseQueryResult({ data: [] }));
  mockUseCreateCycle.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateCycle.mockReturnValue({ mutate: mockUpdateMutate, isPending: false });
  mockUseDeleteCycle.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
  mockUpdateMutate.mockClear();
  mockDeleteMutate.mockClear();
});

it("renders NoPermissionState when build:cycles:view is denied instead of empty state", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseCycles.mockReturnValue(baseQueryResult());
  render(<CyclesPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("shows actual query error message on failure instead of hardcoded text", () => {
  mockUseCycles.mockReturnValue(
    baseQueryResult({ isError: true, error: new Error("Build module is not enabled for this project") }),
  );
  render(<CyclesPage projectId={1} />);
  const errorEl = screen.getByTestId("error-state");
  expect(errorEl.textContent).toContain("Build module is not enabled");
});

it("shows the skeleton, not a denial, while the access snapshot is still in flight, because useCan answers false before it lands", () => {
  mockUseAccess.mockReturnValue({ data: undefined, isLoading: true });
  mockUseCycles.mockReturnValue(baseQueryResult());
  render(<CyclesPage projectId={1} />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("offers the upgrade path the backend sent with a 402 rather than a generic failure", () => {
  mockUseCycles.mockReturnValue(
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
    mockUseCycles.mockReturnValue(baseQueryResult({ data: [COMPLETED_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByText("Completed (1)")).toBeDefined();
    expect(screen.queryByText("Closed cycle")).toBeNull();
  });

  it("expands completed cycles from completed=1 so the disclosure survives a reload or a shared link", () => {
    mockSearchParamsContainer.current = new URLSearchParams("completed=1");
    mockUseCycles.mockReturnValue(baseQueryResult({ data: [COMPLETED_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.getByText("Closed cycle")).toBeDefined();
  });

  it("writes the disclosure to the URL instead of mutating component state", () => {
    mockUseCycles.mockReturnValue(baseQueryResult({ data: [COMPLETED_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    screen.getByText("Completed (1)").click();
    expect(mockReplace).toHaveBeenCalledWith("/build/1/cycles?completed=1", {
      scroll: false,
    });
  });
});

describe("CyclesPage — cycle lifecycle actions", () => {
  const ACTIVE_CYCLE = {
    id: 4,
    name: "Current cycle",
    status: "active",
    startDate: "2026-09-01",
    endDate: "2026-09-14",
    progress: 50,
    completedItems: 2,
    totalItems: 4,
  };

  it("opens the edit sheet from the cycle action menu", () => {
    mockUseCycles.mockReturnValue(baseQueryResult({ data: [ACTIVE_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByTestId("cycle-form-sheet")).toHaveTextContent("Editing Current cycle");
  });

  it("completes an active cycle through a confirmation", () => {
    mockUseCycles.mockReturnValue(baseQueryResult({ data: [ACTIVE_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    expect(screen.getByRole("heading", { name: "Complete cycle?" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Complete" }));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { projectId: 1, cycleId: 4, status: "completed" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("reopens a completed cycle from the expanded completed section", () => {
    mockSearchParamsContainer.current = new URLSearchParams("completed=1");
    mockUseCycles.mockReturnValue(baseQueryResult({ data: [{ ...ACTIVE_CYCLE, status: "completed" }] }));
    render(<CyclesPage projectId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Reopen" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reopen" }));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { projectId: 1, cycleId: 4, status: "active" },
      expect.any(Object),
    );
  });

  it("deletes a cycle only after confirmation", () => {
    mockUseCycles.mockReturnValue(baseQueryResult({ data: [ACTIVE_CYCLE] }));
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
    mockUseCycles.mockReturnValue(baseQueryResult({ data: [ACTIVE_CYCLE] }));
    render(<CyclesPage projectId={1} />);
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});
