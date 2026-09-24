import { render, screen } from "@testing-library/react";
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
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
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

import { useCycles, useCreateCycle } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseCycles = useCycles as jest.Mock;
const mockUseCreateCycle = useCreateCycle as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:sprints:view": "all" }, modules: {} },
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
});

it("renders NoPermissionState when build:sprints:view is denied instead of empty state", () => {
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
