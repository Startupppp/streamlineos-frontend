import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-envelope";

const mockUseTestCases = jest.fn();
const mockUseTestSuites = jest.fn();
const mockUseDeleteTestCase = jest.fn();
const mockUseUpdateTestCase = jest.fn();
const mockUseCan = jest.fn();
const mockUseAccess = jest.fn();
const mockCreateCase = jest.fn();
const mockTestRunsTab = jest.fn((_props: { projectId: number; createNonce?: number }) => null);
jest.mock("./test-runs-tab", () => ({
  TestRunsTab: (props: { projectId: number; createNonce?: number }) => { mockTestRunsTab(props); return null; },
}));
jest.mock("@/hooks/api/build/projects", () => ({ useProject: () => ({ data: { key: "QA" } }) }));
jest.mock("@/features/build/shared/ticket-combobox", () => ({ TicketCombobox: () => null }));

jest.mock("@/hooks/api/build/qa", () => ({
  useTestCases: (...args: unknown[]) => mockUseTestCases(...args),
  useTestSuites: (...args: unknown[]) => mockUseTestSuites(...args),
  useDeleteTestCase: () => mockUseDeleteTestCase(),
  useUpdateTestCase: () => mockUseUpdateTestCase(),
  useCreateTestCase: () => ({ mutate: mockCreateCase, isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (...args: unknown[]) => mockUseCan(...args),
  useAccess: () => mockUseAccess(),
  useCanState: () => "granted",
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: unknown) => v,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: { onMouseEnter: jest.fn(), onMouseLeave: jest.fn() } }),
}));

jest.mock("@/features/build/shared/use-build-cursor-pager", () => ({
  useBuildCursorPager: () => ({
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
  DataTable: ({ selection }: { selection?: { onChange: (s: Set<string | number>) => void } }) => {
    const handleSelectRow = () => selection?.onChange(new Set([42]));
    return <div data-testid="data-table" onClick={handleSelectRow} />;
  },
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
import { QaPage } from "./qa-page";
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

it.each([false, true])("gives the actual case sheet an accessible description and cancels without mutation (editing=%s)", async (editing) => {
  const { TestCaseSheet } = jest.requireActual<typeof import("./test-case-sheet")>("./test-case-sheet");
  const warning = jest.spyOn(console, "warn");
  const close = jest.fn();
  const editCase = editing ? testCasePageContract.shape.data.element.parse({
    id: 42, orgId: "test-org", projectId: 1, suiteId: null, caseNumber: 1,
    title: "Login flow", preconditions: null, steps: [], expectedResult: null,
    priority: "medium", component: null, linkedTicketId: null, automationStatus: "manual",
    createdBy: null, createdAt: "2026-10-05T00:00:00Z", updatedAt: "2026-10-05T00:00:00Z", deletedAt: null,
  }) : null;
  render(<TestCaseSheet projectId={1} open onOpenChange={close} editCase={editCase} suites={[]} />);
  const dialog = screen.getByRole("dialog", { name: editing ? "Edit Test Case" : "New Test Case" });
  try {
    expect(dialog).toHaveAccessibleDescription("Define the test steps and expected results for this project.");
    expect(warning).not.toHaveBeenCalledWith(expect.stringContaining("Missing `Description`"));
    await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }));
    expect(close).toHaveBeenCalledWith(false);
    expect(mockCreateCase).not.toHaveBeenCalled();
    expect(mockUseUpdateTestCase().mutate).not.toHaveBeenCalled();
  } finally { warning.mockRestore(); }
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

it("restores the QA tab from the URL, preserves facets and dispatches only the matching create action", async () => {
  mockSearchParams = new URLSearchParams("tab=runs&q=Regression&status=completed");
  const view = render(<QaPage projectId={7} />);
  expect(screen.getByRole("tab", { name: "Test Runs" })).toHaveAttribute("data-state", "active");
  await userEvent.setup().click(screen.getByRole("button", { name: "New Test Run" }));
  expect(mockTestRunsTab).toHaveBeenLastCalledWith({ projectId: 7, createNonce: 1 });
  await userEvent.setup().click(screen.getByRole("tab", { name: "Test Cases" }));
  expect(mockReplace).toHaveBeenLastCalledWith("?q=Regression&status=completed", { scroll: false });
  mockSearchParams = new URLSearchParams("q=Regression&status=completed");
  view.rerender(<QaPage projectId={7} />);
  expect(screen.getByRole("tab", { name: "Test Cases" })).toHaveAttribute("data-state", "active");
  mockSearchParams = new URLSearchParams("tab=runs&q=Regression&status=completed");
  view.rerender(<QaPage projectId={7} />);
  expect(screen.getByRole("tab", { name: "Test Runs" })).toHaveAttribute("data-state", "active");
  mockUseCan.mockReturnValue(false);
  view.rerender(<QaPage projectId={7} />);
  expect(screen.queryByRole("button", { name: /New Test/ })).toBeNull();
});

it.each(["", "tab=cases", "tab=unknown"])("defaults safely from %s and writes the selected tab without losing facets", async (query) => {
  mockSearchParams = new URLSearchParams(`${query}&q=Regression&priority=high`);
  render(<QaPage projectId={1} />);
  expect(screen.getByRole("tab", { name: "Test Cases" })).toHaveAttribute("data-state", "active");
  expect(screen.getByRole("button", { name: "New Test Case" })).toBeVisible();
  await userEvent.setup().click(screen.getByRole("tab", { name: "Test Runs" }));
  expect(mockReplace).toHaveBeenLastCalledWith(query ? "?tab=runs&q=Regression&priority=high" : "?q=Regression&priority=high&tab=runs", { scroll: false });
});
