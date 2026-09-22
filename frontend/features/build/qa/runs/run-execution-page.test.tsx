import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-envelope";

const mockUseTestRunDetail = jest.fn();
const mockUseUpdateTestRun = jest.fn();
const mockUseCreateBugFromResult = jest.fn();
const mockUseCan = jest.fn();
const mockUseAccess = jest.fn();
const mockUseRegisterBuildDirtyState = jest.fn();

jest.mock("@/hooks/api/build/qa", () => ({
  useTestRunDetail: (...args: unknown[]) => mockUseTestRunDetail(...args),
  useUpdateTestRun: () => mockUseUpdateTestRun(),
  useCreateBugFromResult: () => mockUseCreateBugFromResult(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (...args: unknown[]) => mockUseCan(...args),
  useAccess: () => mockUseAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: (...args: unknown[]) => mockUseRegisterBuildDirtyState(...args),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@animateicons/react/lucide", () => ({
  CircleCheckIcon: ({ ...props }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: ReactNode; title?: string }) => (
    <div>{title ? <h1>{title}</h1> : null}{children}</div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
  PM_PANEL: "",
}));

jest.mock("./result-row", () => ({
  ResultRow: () => <div data-testid="result-row" />,
}));

import { RunExecutionPage } from "./run-execution-page";

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:qa:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const ACCESS_LOADING = { data: undefined, isLoading: true };

function baseQuery(overrides = {}) {
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
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseTestRunDetail.mockReturnValue(baseQuery({ data: { id: 1, name: "Run 1", results: [], status: "not_started", counts: { total: 0, passed: 0, failed: 0, blocked: 0, skipped: 0, not_run: 0 } } }));
  mockUseUpdateTestRun.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseCreateBugFromResult.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseRegisterBuildDirtyState.mockReturnValue(undefined);
});

it("renders NoPermissionState when build:qa:view is denied instead of error state", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseTestRunDetail.mockReturnValue(baseQuery());
  render(<RunExecutionPage projectId={1} runId={1} />);
  expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
});

it("shows loading state while the access snapshot is still in flight rather than error state", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseTestRunDetail.mockReturnValue(baseQuery());
  render(<RunExecutionPage projectId={1} runId={1} />);
  expect(screen.queryByText(/access restricted/i)).toBeNull();
  expect(screen.queryByTestId("error-state")).toBeNull();
});

it("renders the upgrade path the backend sent with a 402 rather than a generic error", () => {
  const err = new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", {
    moduleKey: "build",
    reason: "not-in-plan",
    upgradePath: "/settings/billing",
  });
  mockUseTestRunDetail.mockReturnValue(baseQuery({ isError: true, error: err }));
  render(<RunExecutionPage projectId={1} runId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});
