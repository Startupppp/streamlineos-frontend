import React from "react";
import { render, screen } from "@testing-library/react";
import { ModulesPage } from "./modules-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/1/modules",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/build", () => ({
  useModulePages: jest.fn(),
  useCreateModule: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
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

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: ({ label, value }: { label: string; value: number }) => (
    <div data-testid="stat-card">{label}: {value}</div>
  ),
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StatCardGridSkeleton: () => <div data-testid="stat-card-skeleton" />,
}));

jest.mock("@/features/build/modules/module-card", () => ({
  ModuleCard: ({ module: mod }: { module: { name: string } }) => (
    <div data-testid="module-card">{mod.name}</div>
  ),
  ModuleCardSkeleton: () => <div data-testid="module-card-skeleton" />,
}));

jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: () => null,
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({ ref: _ref, ...props }: React.ComponentPropsWithRef<"span">) => <span {...props} />,
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: () => <input data-testid="date-picker" />,
}));

jest.mock("@/components/members/project-member-select", () => ({
  ProjectMemberSelect: () => <div data-testid="member-select" />,
}));

jest.mock("@/components/ui/emoji-icon-picker", () => ({
  EmojiIconPicker: () => <div data-testid="emoji-icon-picker" />,
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/lib/date-constraints", () => ({
  clearEndIfInvalid: jest.fn((_, end) => end),
  planningStartPickerProps: jest.fn(() => ({ fromDate: undefined, fromYear: 2020, toYear: 2030 })),
  planningEndPickerProps: jest.fn(() => ({ fromDate: undefined, fromYear: 2020, toYear: 2030 })),
}));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() })),
}));

import { useModulePages, useCreateModule } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";

const mockUseModulePages = useModulePages as jest.Mock;
const mockUseCreateModule = useCreateModule as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildListKeyboard = useBuildListKeyboard as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function basePages(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    refetch: jest.fn(),
    ...overrides,
  };
}

const MODULE_ROW = {
  id: 1,
  name: "Auth Module",
  orgId: "org-1",
  projectId: 7,
  status: "in-progress" as const,
  leadId: null,
  startDate: null,
  endDate: null,
  createdBy: "user-1",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  description: null,
  totalItems: 5,
  completedItems: 2,
  progress: 40,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseCreateModule.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
});

it("renders NoPermissionState when build:view is denied, not an empty-success state", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseModulePages.mockReturnValue(basePages());
  render(<ModulesPage projectId={7} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  expect(screen.queryByTestId("stat-card")).not.toBeInTheDocument();
});

it("shows skeletons, not a denial, while the access snapshot is in flight", () => {
  mockUseAccess.mockReturnValue({ data: undefined, isLoading: true });
  mockUseModulePages.mockReturnValue(basePages({ isLoading: true }));
  render(<ModulesPage projectId={7} />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
  expect(screen.getByTestId("stat-card-skeleton")).toBeInTheDocument();
});

it("renders the error state with backend message on query failure", () => {
  mockUseModulePages.mockReturnValue(
    basePages({ isError: true, error: new Error("Failed to load modules") }),
  );
  render(<ModulesPage projectId={7} />);
  const errorEl = screen.getByTestId("error-state");
  expect(errorEl.textContent).toContain("Failed to load modules");
});

it("surfaces the 402 upgrade path instead of a generic error when the module is not in plan", () => {
  mockUseModulePages.mockReturnValue(
    basePages({
      isError: true,
      error: new ApiError("Build is not included in your plan.", 402, "MODULE_NOT_ENABLED", {
        moduleKey: "build",
        reason: "not-in-plan",
        upgradePath: "/settings/billing",
      }),
    }),
  );
  render(<ModulesPage projectId={7} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("renders the empty state with create action when there are no modules and user has manage permission", () => {
  mockUseModulePages.mockReturnValue(
    basePages({ data: { pages: [{ data: [] }] } }),
  );
  render(<ModulesPage projectId={7} />);
  expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  expect(screen.getByTestId("empty-state").textContent).toContain("No modules yet");
});

it("renders module cards when modules are present", () => {
  mockUseModulePages.mockReturnValue(
    basePages({
      data: { pages: [{ data: [MODULE_ROW] }] },
    }),
  );
  render(<ModulesPage projectId={7} />);
  expect(screen.getByTestId("module-card")).toBeInTheDocument();
  expect(screen.getByTestId("module-card").textContent).toBe("Auth Module");
});

it("does not render the create sheet trigger when the user lacks build:workspace:manage", () => {
  mockUseCan.mockReturnValue(false);
  mockUseModulePages.mockReturnValue(
    basePages({ data: { pages: [{ data: [MODULE_ROW] }] } }),
  );
  render(<ModulesPage projectId={7} />);
  expect(screen.queryByText("New Module")).not.toBeInTheDocument();
});

it("shows the correct stat counts from module list", () => {
  const modules = [
    { ...MODULE_ROW, id: 1, status: "in-progress" as const },
    { ...MODULE_ROW, id: 2, status: "completed" as const },
    { ...MODULE_ROW, id: 3, status: "planned" as const },
  ];
  mockUseModulePages.mockReturnValue(
    basePages({ data: { pages: [{ data: modules }] } }),
  );
  render(<ModulesPage projectId={7} />);
  const cards = screen.getAllByTestId("stat-card");
  expect(cards.find((c) => c.textContent?.includes("Total: 3"))).toBeTruthy();
  expect(cards.find((c) => c.textContent?.includes("In Progress: 1"))).toBeTruthy();
  expect(cards.find((c) => c.textContent?.includes("Completed: 1"))).toBeTruthy();
  expect(cards.find((c) => c.textContent?.includes("Planned: 1"))).toBeTruthy();
});

it("enables keyboard navigation bound to the module count when modules are present and access is granted", () => {
  mockUseModulePages.mockReturnValue(
    basePages({ data: { pages: [{ data: [MODULE_ROW] }] } }),
  );
  render(<ModulesPage projectId={7} />);
  const calls = mockUseBuildListKeyboard.mock.calls;
  const lastArgs = calls[calls.length - 1]?.[0];
  expect(lastArgs?.enabled).toBe(true);
  expect(lastArgs?.itemCount).toBe(1);
});
