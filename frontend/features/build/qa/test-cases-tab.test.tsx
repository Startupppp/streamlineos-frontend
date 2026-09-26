import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-envelope";

const mockUseTestCases = jest.fn();
const mockUseTestSuites = jest.fn();
const mockUseDeleteTestCase = jest.fn();
const mockUseUpdateTestCase = jest.fn();
const mockUseCan = jest.fn();
const mockUseAccess = jest.fn();

jest.mock("@/hooks/api/build/qa", () => ({
  useTestCases: (...args: unknown[]) => mockUseTestCases(...args),
  useTestSuites: (...args: unknown[]) => mockUseTestSuites(...args),
  useDeleteTestCase: () => mockUseDeleteTestCase(),
  useUpdateTestCase: () => mockUseUpdateTestCase(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (...args: unknown[]) => mockUseCan(...args),
  useAccess: () => mockUseAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: unknown) => v,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/components/ui/table-pagination", () => ({
  useCursorPager: () => ({
    cursor: undefined,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({ ...props }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({ selection }: { selection?: { onChange: (s: Set<string | number>) => void } }) => (
    <div
      data-testid="data-table"
      onClick={() => selection?.onChange(new Set([42]))}
    />
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

const mockTestCaseSheet = jest.fn((_props: { open: boolean }) => null);
jest.mock("./test-case-sheet", () => ({
  TestCaseSheet: (props: { open: boolean }) => { mockTestCaseSheet(props); return null; },
}));

const mockQaBulkActionBar = jest.fn(
  (_props: { projectId: number; selectedIds: Set<string | number>; onClear: () => void }) => null,
);
jest.mock("./qa-bulk-action-bar", () => ({
  QaBulkActionBar: (props: { projectId: number; selectedIds: Set<string | number>; onClear: () => void }) => {
    mockQaBulkActionBar(props);
    return <div data-testid="bulk-action-bar">{props.selectedIds.size} selected</div>;
  },
}));

jest.mock("./test-case-columns", () => ({
  buildTestCaseColumns: () => [],
}));

import { TestCasesTab } from "./test-cases-tab";
import { testCasePageContract } from "@/hooks/api/build/qa-schema";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/build",
  useSearchParams: () => mockSearchParams,
}));

beforeEach(() => {
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams();
});


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

const EMPTY_PAGE = { data: [], hasMore: false, nextCursor: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseTestCases.mockReturnValue(baseQuery({ data: EMPTY_PAGE }));
  mockUseTestSuites.mockReturnValue(baseQuery({ data: [] }));
  mockUseDeleteTestCase.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateTestCase.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

it("testCasePageContract rejects a bare array so a backend regression serving the old array shape fails loudly instead of rendering an empty list", () => {
  const result = testCasePageContract.safeParse([]);
  expect(result.success).toBe(false);
});

it("testCasePageContract accepts a valid page envelope with data and pagination fields", () => {
  const result = testCasePageContract.safeParse(EMPTY_PAGE);
  expect(result.success).toBe(true);
});

it("renders NoPermissionState when build:qa:view is denied instead of the no-cases empty state", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseTestCases.mockReturnValue(baseQuery());
  render(<TestCasesTab projectId={1} />);
  expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("shows loading state while the access snapshot is still in flight rather than a false denial", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseTestCases.mockReturnValue(baseQuery());
  render(<TestCasesTab projectId={1} />);
  expect(screen.queryByText(/access restricted/i)).toBeNull();
  expect(screen.queryByTestId("empty-state")).toBeNull();
});

it("renders the upgrade path the backend sent with a 402 rather than a generic failure", () => {
  const err = new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", {
    moduleKey: "build",
    reason: "not-in-plan",
    upgradePath: "/settings/billing",
  });
  mockUseTestCases.mockReturnValue(baseQuery({ isError: true, error: err }));
  render(<TestCasesTab projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("pressing j then Enter opens the first test case in the edit sheet so keyboard users can inspect it without a mouse", () => {
  const tc = { id: 42, caseNumber: 1, title: "Login flow", suiteId: null };
  mockUseTestCases.mockReturnValue(baseQuery({ data: { data: [tc], hasMore: false, nextCursor: null } }));
  render(<TestCasesTab projectId={1} />);
  fireEvent.keyDown(document, { key: "j" });
  fireEvent.keyDown(document, { key: "Enter" });
  const calls = mockTestCaseSheet.mock.calls;
  const lastCall = calls[calls.length - 1][0] as { open: boolean };
  expect(lastCall.open).toBe(true);
});

it("pressing c opens the create sheet when build:qa:manage is granted", () => {
  mockUseCan.mockReturnValue(true);
  render(<TestCasesTab projectId={1} />);
  fireEvent.keyDown(document, { key: "c" });
  const calls = mockTestCaseSheet.mock.calls;
  const lastCall = calls[calls.length - 1][0] as { open: boolean };
  expect(lastCall.open).toBe(true);
});

it("pressing e on the focused test case opens the edit sheet", () => {
  const tc = { id: 42, caseNumber: 1, title: "Login flow", suiteId: null };
  mockUseTestCases.mockReturnValue(baseQuery({ data: { data: [tc], hasMore: false, nextCursor: null } }));
  render(<TestCasesTab projectId={1} />);
  fireEvent.keyDown(document, { key: "j" });
  fireEvent.keyDown(document, { key: "e" });
  const calls = mockTestCaseSheet.mock.calls;
  const lastCall = calls[calls.length - 1][0] as { open: boolean };
  expect(lastCall.open).toBe(true);
});

it("bulk action bar renders with correct selected count when rows are selected via the data table", () => {
  const tc = { id: 42, caseNumber: 1, title: "Login flow", suiteId: null };
  mockUseTestCases.mockReturnValue(baseQuery({ data: { data: [tc], hasMore: false, nextCursor: null } }));
  render(<TestCasesTab projectId={1} />);
  expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
  fireEvent.click(screen.getByTestId("data-table"));
  expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();
  expect(screen.getByTestId("bulk-action-bar")).toHaveTextContent("1 selected");
});
