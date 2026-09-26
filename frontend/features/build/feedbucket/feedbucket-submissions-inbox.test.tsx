import { render, screen, fireEvent } from "@testing-library/react";
import * as mockInboxModules from "./inbox-test-mocks";
import { ProjectSubmissionsInbox } from "./project-submissions-inbox";

const { SAMPLE_SUBMISSION_ROW, baseInboxQueryResult, makeCursorPage } = mockInboxModules;

const mockUseSearchParams = jest.fn(() => new URLSearchParams());
const mockRouterReplace = jest.fn();
const mockRouterPush = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
  useRouter: () => ({ replace: mockRouterReplace, push: mockRouterPush }),
  usePathname: () => "/build/1/feedbucket",
}));

const mockUseFeedbucketSubmissions = jest.fn();
const mockUseDeleteFeedbucketSubmission = jest.fn();

jest.mock("@/hooks/api/feedbucket", () => ({
  useFeedbucketSubmissions: (...args: unknown[]) => mockUseFeedbucketSubmissions(...args),
  useDeleteFeedbucketSubmission: () => mockUseDeleteFeedbucketSubmission(),
}));

const mockUseCan = jest.fn().mockReturnValue(false);

jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockUseCan(key) }));
jest.mock("@/hooks/common/use-animated-icon", () => mockInboxModules.animatedIconModule);
jest.mock("date-fns", () => mockInboxModules.dateFnsModule);
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/utils", () => mockInboxModules.utilsModule);
jest.mock("@/components/ui/data-table", () => mockInboxModules.dataTableModule);
jest.mock("@/components/shared/submission-bulk-toolbar", () => mockInboxModules.bulkToolbarModule);
jest.mock("@/components/ui/search-input", () => mockInboxModules.searchInputModule);
jest.mock("@/components/ui/user-combobox", () => mockInboxModules.userComboboxModule);
jest.mock("@/components/ui/empty-state", () => mockInboxModules.emptyStateModule);
jest.mock("@/components/shared", () => mockInboxModules.sharedModule);
jest.mock("@/components/ui/skeleton", () => mockInboxModules.skeletonModule);
jest.mock("@/components/ui/confirm-dialog", () => mockInboxModules.confirmDialogModule);
jest.mock("@/components/illustrations", () => mockInboxModules.illustrationsModule);
jest.mock("@/components/ui/badge", () => mockInboxModules.badgeModule);
jest.mock("@/components/ui/input", () => mockInboxModules.inputModule);
jest.mock("@/components/ui/truncated-text", () => mockInboxModules.truncatedTextModule);
jest.mock("@/components/ui/select", () => mockInboxModules.selectModule);

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSearchParams.mockReturnValue(new URLSearchParams());
  mockUseCan.mockReturnValue(false);
  mockUseDeleteFeedbucketSubmission.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseFeedbucketSubmissions.mockReturnValue(
    baseInboxQueryResult({ data: makeCursorPage() }),
  );
});

describe("ProjectSubmissionsInbox — state ladder", () => {
  it("renders skeletons while loading and no data-table so the user sees motion, not an empty shell", () => {
    mockUseFeedbucketSubmissions.mockReturnValue(
      baseInboxQueryResult({ isLoading: true, data: undefined }),
    );
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
  });

  it("still renders the data-table when there are rows so the positive control shows content, not a skeleton", () => {
    mockUseFeedbucketSubmissions.mockReturnValue(
      baseInboxQueryResult({ data: makeCursorPage([SAMPLE_SUBMISSION_ROW]) }),
    );
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("renders the error state when the query fails and not the empty state so a network denial is not silently presented as an empty inbox", () => {
    mockUseFeedbucketSubmissions.mockReturnValue(
      baseInboxQueryResult({ isError: true, data: undefined }),
    );
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
  });
});

describe("ProjectSubmissionsInbox — first-run empty vs filtered-empty", () => {
  function renderWithParams(query: string) {
    mockUseSearchParams.mockReturnValue(new URLSearchParams(query));
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);
  }

  it("shows the first-run empty title when no filters are active and the inbox is empty", () => {
    renderWithParams("");
    expect(screen.getByTestId("empty-title")).toHaveTextContent("No submissions yet");
  });

  it("shows the filtered-empty title when the status filter is active and the inbox is empty", () => {
    renderWithParams("status=open");
    expect(screen.getByTestId("empty-title")).toHaveTextContent("No matching submissions");
  });

  it("shows the filtered-empty title when the type filter is active and the inbox is empty", () => {
    renderWithParams("type=bug");
    expect(screen.getByTestId("empty-title")).toHaveTextContent("No matching submissions");
  });

  it("counts the owner filter as an active filter so an owner-filtered empty inbox offers Clear filters", () => {
    renderWithParams("assigneeId=user-owner");
    expect(screen.getByTestId("empty-title")).toHaveTextContent("No matching submissions");
  });

  it("counts the search filter as an active filter so a search-empty inbox offers Clear filters", () => {
    renderWithParams("search=crash");
    expect(screen.getByTestId("empty-title")).toHaveTextContent("No matching submissions");
  });

  it("counts the linked filter as an active filter", () => {
    renderWithParams("linked=linked");
    expect(screen.getByTestId("empty-title")).toHaveTextContent("No matching submissions");
  });

  it("counts the from and to bounds as active filters", () => {
    renderWithParams("from=2026-01-01T00%3A00%3A00Z&to=2026-06-01T00%3A00%3A00Z");
    expect(screen.getByTestId("empty-title")).toHaveTextContent("No matching submissions");
  });

  it("offers a clear-filters action in filtered-empty so the user can escape without navigating away", () => {
    renderWithParams("status=resolved");
    expect(screen.getByTestId("empty-action")).toHaveTextContent("Clear filters");
  });

  it("does NOT offer the clear-filters action for first-run empty because there is nothing to clear", () => {
    renderWithParams("");
    expect(screen.queryByTestId("empty-action")).not.toBeInTheDocument();
  });
});

describe("ProjectSubmissionsInbox — selection gating", () => {
  function renderWithRows() {
    mockUseFeedbucketSubmissions.mockReturnValue(
      baseInboxQueryResult({ data: makeCursorPage([SAMPLE_SUBMISSION_ROW]) }),
    );
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);
  }

  it("offers no row selection to a viewer who can neither update nor delete", () => {
    mockUseCan.mockReturnValue(false);
    renderWithRows();

    expect(screen.getByTestId("data-table")).toHaveAttribute("data-selection", "absent");
  });

  it("offers row selection to an actor who may update submissions", () => {
    mockUseCan.mockImplementation((key: string) => key === "feedbucket:submissions:update");
    renderWithRows();

    expect(screen.getByTestId("data-table")).toHaveAttribute("data-selection", "present");
  });

  it("offers row selection to an actor who may only delete submissions", () => {
    mockUseCan.mockImplementation((key: string) => key === "feedbucket:submissions:delete");
    renderWithRows();

    expect(screen.getByTestId("data-table")).toHaveAttribute("data-selection", "present");
  });

  it("renders no bulk toolbar until something is selected, so the bar never claims a scope of zero", () => {
    mockUseCan.mockImplementation((key: string) => key === "feedbucket:submissions:update");
    renderWithRows();

    expect(screen.queryByTestId("bulk-toolbar")).not.toBeInTheDocument();
  });
});

describe("ProjectSubmissionsInbox — keyboard shortcuts", () => {
  it("navigates to submission detail on Enter after j selects the first row so keyboard users can open a submission without a mouse", () => {
    mockUseFeedbucketSubmissions.mockReturnValue(
      baseInboxQueryResult({ data: makeCursorPage([SAMPLE_SUBMISSION_ROW]) }),
    );
    render(<ProjectSubmissionsInbox widgetId={1} projectId={7} />);

    fireEvent.keyDown(document, { key: "j" });
    fireEvent.keyDown(document, { key: "Enter" });

    expect(mockRouterPush).toHaveBeenCalledWith("/build/7/feedbucket/1");
  });
});
