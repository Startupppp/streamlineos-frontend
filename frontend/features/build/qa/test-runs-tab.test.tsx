import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-envelope";
import type { TestRun } from "@/types/projects";

const mockUseTestRuns = jest.fn();
const mockUseDeleteTestRun = jest.fn();
const mockUseCan = jest.fn();
const mockUseAccess = jest.fn();

jest.mock("@/hooks/api/build/qa", () => ({
  useTestRuns: (...args: unknown[]) => mockUseTestRuns(...args),
  useDeleteTestRun: () => mockUseDeleteTestRun(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (...args: unknown[]) => mockUseCan(...args),
  useAccess: () => mockUseAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({ ref: _ref, ...props }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
  Trash2Icon: ({ ref: _ref, ...props }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

interface MockDataTableColumn<T> {
  key: string;
  cell: (row: T) => ReactNode;
}

jest.mock("@/components/ui/data-table", () => ({
  DataTable: <T,>({
    data,
    columns,
    getRowKey,
  }: {
    data: T[];
    columns: MockDataTableColumn<T>[];
    getRowKey: (row: T, index: number) => string | number;
  }) => (
    <table data-testid="data-table">
      <tbody>
        {data.map((row, index) => (
          <tr key={getRowKey(row, index)}>
            {columns.map((col) => (
              <td key={col.key}>{col.cell(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("./test-run-sheet", () => ({
  TestRunSheet: () => null,
}));

import { TestRunsTab } from "./test-runs-tab";

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
  mockUseTestRuns.mockReturnValue(baseQuery({ data: [] }));
  mockUseDeleteTestRun.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

it("renders NoPermissionState when build:qa:view is denied instead of the no-runs empty state", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseTestRuns.mockReturnValue(baseQuery());
  render(<TestRunsTab projectId={1} />);
  expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("shows loading state while the access snapshot is still in flight rather than a false denial", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseTestRuns.mockReturnValue(baseQuery());
  render(<TestRunsTab projectId={1} />);
  expect(screen.queryByText(/access restricted/i)).toBeNull();
  expect(screen.queryByTestId("empty-state")).toBeNull();
});

it("renders the upgrade path the backend sent with a 402 rather than a generic failure", () => {
  const err = new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", {
    moduleKey: "build",
    reason: "not-in-plan",
    upgradePath: "/settings/billing",
  });
  mockUseTestRuns.mockReturnValue(baseQuery({ isError: true, error: err }));
  render(<TestRunsTab projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("falls back to a readable label instead of rendering blank text for a run status outside the known status map", () => {
  const runWithUnknownStatus = {
    id: 1,
    runNumber: 7,
    name: "Regression sweep",
    status: "in_review",
    environment: "Staging",
    counts: undefined,
  } satisfies Pick<TestRun, "id" | "runNumber" | "name" | "status" | "environment" | "counts">;
  mockUseTestRuns.mockReturnValue(baseQuery({ data: [runWithUnknownStatus] }));
  render(<TestRunsTab projectId={1} />);
  expect(screen.getByText("in review")).toBeInTheDocument();
  expect(screen.queryByText("undefined")).not.toBeInTheDocument();
});
