import { fireEvent, render, screen } from "@testing-library/react";
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

jest.mock("@/hooks/api/access", () => ({ useCan: () => false }));
jest.mock("@/hooks/common/use-animated-icon", () => mockInboxModules.animatedIconModule);
jest.mock("date-fns", () => mockInboxModules.dateFnsModule);
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/utils", () => mockInboxModules.utilsModule);
jest.mock("@/components/ui/data-table", () => mockInboxModules.dataTableModule);
jest.mock("./submission-bulk-toolbar", () => mockInboxModules.bulkToolbarModule);
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

function lastQueryArgs(): Record<string, unknown> {
  const calls = mockUseFeedbucketSubmissions.mock.calls;
  return calls[calls.length - 1][0] as Record<string, unknown>;
}

function renderWithParams(query: string, widgetId = 1) {
  mockUseSearchParams.mockReturnValue(new URLSearchParams(query));
  render(<ProjectSubmissionsInbox widgetId={widgetId} projectId={1} />);
}

function renderWalkablePage() {
  mockUseFeedbucketSubmissions.mockReturnValue(
    baseInboxQueryResult({
      data: makeCursorPage([SAMPLE_SUBMISSION_ROW], { hasMore: true, nextCursor: "cursor-2" }),
    }),
  );
  render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSearchParams.mockReturnValue(new URLSearchParams());
  mockUseDeleteFeedbucketSubmission.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseFeedbucketSubmissions.mockReturnValue(
    baseInboxQueryResult({ data: makeCursorPage() }),
  );
});

describe("ProjectSubmissionsInbox — every filter is sent to the server, none applied to loaded rows", () => {
  it("sends no status when the URL carries none", () => {
    renderWithParams("", 2);
    expect(lastQueryArgs().widgetId).toBe(2);
    expect(lastQueryArgs().status).toBeUndefined();
  });

  it("sends the status param from the URL", () => {
    renderWithParams("status=in_progress", 2);
    expect(lastQueryArgs()).toMatchObject({ widgetId: 2, status: "in_progress" });
  });

  it("sends the type param from the URL", () => {
    renderWithParams("type=feature", 3);
    expect(lastQueryArgs()).toMatchObject({ widgetId: 3, type: "feature" });
  });

  it("omits type when the URL carries none so the API returns all types unfiltered", () => {
    renderWithParams("status=open", 3);
    expect(lastQueryArgs().type).toBeUndefined();
  });

  it("sends linked=linked from the URL", () => {
    renderWithParams("linked=linked", 4);
    expect(lastQueryArgs()).toMatchObject({ widgetId: 4, linked: "linked" });
  });

  it("sends linked=unlinked from the URL", () => {
    renderWithParams("linked=unlinked", 4);
    expect(lastQueryArgs()).toMatchObject({ linked: "unlinked" });
  });

  it("omits linked when the URL carries none so all link states are returned", () => {
    renderWithParams("", 4);
    expect(lastQueryArgs().linked).toBeUndefined();
  });

  it("sends the from bound from the URL", () => {
    renderWithParams("from=2026-01-01T00%3A00%3A00Z", 5);
    expect(lastQueryArgs()).toMatchObject({ from: "2026-01-01T00:00:00Z" });
  });

  it("sends the to bound from the URL", () => {
    renderWithParams("to=2026-06-01T00%3A00%3A00Z", 5);
    expect(lastQueryArgs()).toMatchObject({ to: "2026-06-01T00:00:00Z" });
  });

  it("omits from and to when the URL carries neither", () => {
    renderWithParams("status=open", 5);
    expect(lastQueryArgs().from).toBeUndefined();
    expect(lastQueryArgs().to).toBeUndefined();
  });

  it("sends the assigneeId owner filter to the server rather than filtering loaded rows by owner", () => {
    renderWithParams("assigneeId=user-owner", 6);
    expect(lastQueryArgs()).toMatchObject({ widgetId: 6, assigneeId: "user-owner" });
  });

  it("omits assigneeId when no owner is chosen so every owner's submissions are returned", () => {
    renderWithParams("status=open", 6);
    expect(lastQueryArgs().assigneeId).toBeUndefined();
  });

  it("sends search to the server so matching is not done over the loaded page", () => {
    renderWithParams("search=crash", 7);
    expect(lastQueryArgs()).toMatchObject({ widgetId: 7, search: "crash" });
  });

  it("omits search when the URL carries none", () => {
    renderWithParams("status=open", 7);
    expect(lastQueryArgs().search).toBeUndefined();
  });

  it("writes the owner filter into the URL rather than holding it in component state", () => {
    renderWithParams("");

    fireEvent.click(screen.getByTestId("user-combobox"));

    expect(mockRouterReplace).toHaveBeenCalledWith(
      expect.stringContaining("assigneeId=user-owner"),
      { scroll: false },
    );
  });
});

describe("ProjectSubmissionsInbox — keyset pagination", () => {
  it("drives the table in cursor mode so no page number is presented for a live list", () => {
    renderWalkablePage();
    expect(screen.getByTestId("data-table")).toHaveAttribute("data-pagination-mode", "cursor");
  });

  it("passes no total to the table, because a keyset page does not know how many rows exist", () => {
    renderWalkablePage();
    expect(screen.getByTestId("data-table")).toHaveAttribute("data-total", "absent");
  });

  it("forwards the server's hasMore rather than inferring another page from a full row count", () => {
    renderWalkablePage();
    expect(screen.getByTestId("data-table")).toHaveAttribute("data-has-more", "true");
  });

  it("reports hasMore false when the server says this is the last page", () => {
    mockUseFeedbucketSubmissions.mockReturnValue(
      baseInboxQueryResult({ data: makeCursorPage([SAMPLE_SUBMISSION_ROW]) }),
    );
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.getByTestId("data-table")).toHaveAttribute("data-has-more", "false");
  });

  it("sends no cursor on the first page and the server's nextCursor after Next is pressed", () => {
    renderWalkablePage();
    expect(lastQueryArgs().cursor).toBeUndefined();

    fireEvent.click(screen.getByTestId("page-next"));

    expect(lastQueryArgs().cursor).toBe("cursor-2");
  });

  it("walks back to the cursor-less first page rather than guessing a previous cursor", () => {
    renderWalkablePage();

    fireEvent.click(screen.getByTestId("page-next"));
    expect(screen.getByTestId("data-table")).toHaveAttribute("data-has-previous", "true");

    fireEvent.click(screen.getByTestId("page-previous"));
    expect(lastQueryArgs().cursor).toBeUndefined();
  });

  it("returns to the first page when a filter changes, because a cursor cut under one filter is meaningless under another", () => {
    renderWalkablePage();

    fireEvent.click(screen.getByTestId("page-next"));
    expect(lastQueryArgs().cursor).toBe("cursor-2");

    fireEvent.click(screen.getByTestId("user-combobox"));
    expect(lastQueryArgs().cursor).toBeUndefined();
  });
});
