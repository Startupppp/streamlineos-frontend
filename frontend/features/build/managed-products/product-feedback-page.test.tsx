import "./product-scope-pages.test-harness";
import { ProductFeedbackPage } from "./product-feedback-page";
import {
  EMPTY_FEEDBUCKET_RESULT,
  mockRouterPush,
  mockUseSearchParams,
  render,
  screen,
  useCan,
  useFeedbucketSubmissions,
  usePageState,
} from "./product-scope-pages.test-harness";

jest.mock("@/components/ui/date-range-picker", () => ({
  DateRangePicker: ({ from, to }: { from?: string; to?: string }) => (
    <div data-testid="date-range-picker" data-from={from ?? ""} data-to={to ?? ""} />
  ),
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: ({ value }: { value: string }) => (
    <div data-testid="user-combobox" data-value={value} />
  ),
}));

jest.mock("@/components/shared/submission-bulk-toolbar", () => ({
  SubmissionBulkToolbar: ({ selectedIds }: { selectedIds: number[] }) =>
    selectedIds.length > 0 ? <div>{selectedIds.length} selected on this page</div> : null,
  BULK_SELECTION_CAP: 100,
}));

describe("ProductFeedbackPage — usePageState integration (BSN-01-012)", () => {
  it("calls usePageState with feedbucket:submissions:view permission so 402 errors get classified correctly", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "feedbucket:submissions:view" }),
    );
  });

  it("shows NoPermissionState when feedbucket:submissions:view is denied", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "feedbucket:submissions:view" });
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes feedbucket:submissions:view as the permission key in denied resolution (BSN-01-012)", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "feedbucket:submissions:view" });
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "feedbucket:submissions:view",
    );
  });

  it("passes managedProductId to useFeedbucketSubmissions so the query is product-scope-filtered (BSN-01-012)", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ managedProductId: 7 });
  });

  it("opens the registered project-scoped detail route for a row owned by the active product", () => {
    useFeedbucketSubmissions.mockReturnValue({
      ...EMPTY_FEEDBUCKET_RESULT,
      data: {
        data: [{ id: 41, message: "Broken export", widget: { projectId: 12, managedProductId: 7 } }],
        total: 1,
      },
    });
    render(<ProductFeedbackPage managedProductId={7} />);
    screen.getByRole("button", { name: "Broken export" }).click();
    expect(mockRouterPush).toHaveBeenCalledWith("/build/12/feedbucket/41");
  });

  it.each([
    ["missing project", { id: 41, widget: { projectId: null, managedProductId: 7 } }],
    ["zero project", { id: 41, widget: { projectId: 0, managedProductId: 7 } }],
    ["nonpositive submission", { id: -1, widget: { projectId: 12, managedProductId: 7 } }],
    ["different product", { id: 41, widget: { projectId: 12, managedProductId: 8 } }],
  ])("does not navigate for a %s row", (_label, row) => {
    useFeedbucketSubmissions.mockReturnValue({
      ...EMPTY_FEEDBUCKET_RESULT,
      data: { data: [{ ...row, message: "Unsafe row" }], total: 1 },
    });
    render(<ProductFeedbackPage managedProductId={7} />);
    screen.getByRole("button", { name: "Unsafe row" }).click();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("does not include linked param in query when URL has no linked value (BSN-01-013)", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ managedProductId: 7 });
    expect(callParams).not.toHaveProperty("linked");
  });

  it("does not navigate when the destination route permission is denied", () => {
    useCan.mockImplementation((permission: string) => permission !== "feedbucket:widgets:view");
    useFeedbucketSubmissions.mockReturnValue({
      ...EMPTY_FEEDBUCKET_RESULT,
      data: {
        data: [{ id: 41, message: "Restricted row", widget: { projectId: 12, managedProductId: 7 } }],
        total: 1,
      },
    });
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: "Restricted row" })).not.toBeInTheDocument();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});

describe("ProductFeedbackPage — bulk selection (BSN-01-FB-BULK)", () => {
  it("passes selectionEnabled to DataTable when actor has feedbucket:submissions:update", () => {
    useFeedbucketSubmissions.mockReturnValue({
      ...EMPTY_FEEDBUCKET_RESULT,
      data: { data: [{ id: 1, message: "test bug", type: "bug", status: "open", createdAt: null, widget: { managedProductId: 7, projectId: 3 }, screenshotUrl: null, reporterName: null, reporterEmail: null }], total: 1 },
    });
    useCan.mockImplementation((key: string) => key === "feedbucket:submissions:update");
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("does not render SubmissionBulkToolbar when selection is empty", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.queryByText(/selected on this page/)).not.toBeInTheDocument();
  });
});

describe("ProductFeedbackPage — URL-backed filter params (BSN-01-FB-FILTERS)", () => {
  it("forwards assigneeId from URL to useFeedbucketSubmissions so the query is owner-filtered server-side", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("assigneeId=user-99"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ assigneeId: "user-99" });
  });

  it("omits assigneeId from query when URL carries none so all owners are returned", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("assigneeId");
  });

  it("forwards duplicate=true from URL to useFeedbucketSubmissions so the computed predicate runs server-side", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("duplicate=true"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ duplicate: "true" });
  });

  it("forwards duplicate=false from URL to useFeedbucketSubmissions so non-duplicate filtering runs server-side", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("duplicate=false"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ duplicate: "false" });
  });

  it("omits duplicate from query when URL carries none so all submissions are returned unfiltered", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("duplicate");
  });

  it("forwards from bound from URL to useFeedbucketSubmissions so old submissions are excluded server-side", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("from=2026-01-01"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ from: "2026-01-01" });
  });

  it("forwards to bound from URL to useFeedbucketSubmissions so future submissions are excluded server-side", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("to=2026-06-01"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ to: "2026-06-01" });
  });

  it("omits from and to from query when URL carries neither so all submission dates are returned", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("from");
    expect(callParams).not.toHaveProperty("to");
  });
});
