import "./product-scope-pages.test-harness";
import { fireEvent } from "@testing-library/react";
import { ProductFeedbackPage } from "./product-feedback-page";
import {
  EMPTY_FEEDBUCKET_RESULT,
  mockRouterPush,
  mockRouterReplace,
  mockUseSearchParams,
  render,
  screen,
  useCan,
  useFeedbucketSubmissions,
  usePageState,
} from "./product-scope-pages.test-harness";

const mockRouteMutate = jest.fn();

jest.mock("@/components/renderer/use-tenant-layout", () => ({ useTenantLayout: <T,>(l: T): T => l }));

jest.mock("@/hooks/api/build/intake-mutations", () => ({
  useRouteFeedbucketToIntake: jest.fn(() => ({ mutate: mockRouteMutate, isPending: false })),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: jest.fn((e: unknown) => String(e)),
}));

jest.mock("@/components/ui/date-range-picker", () => ({
  DateRangePicker: ({ from, to }: { from?: string; to?: string }) => (
    <div data-testid="date-range-picker" data-from={from ?? ""} data-to={to ?? ""} />
  ),
}));

jest.mock("@/features/build/managed-products/feedback/feedbucket-collect-dialog", () => ({
  FeedbucketCollectDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="feedbucket-collect-dialog" /> : null,
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

jest.mock("@/hooks/api/build/managed-product-members", () => ({
  useManagedProductMembers: jest.fn(() => ({ data: null })),
}));

jest.mock("./feedback/feedback-pane", () => ({
  FeedbackPane: ({
    submissionId,
    onOpenChange,
    onOpenDetail,
  }: {
    submissionId: number;
    onOpenChange: (open: boolean) => void;
    onOpenDetail?: () => void;
  }) => (
    <div data-testid="feedback-pane" data-submission-id={submissionId}>
      <button type="button" onClick={() => onOpenChange(false)}>Close pane</button>
      {onOpenDetail ? <button type="button" onClick={onOpenDetail}>Open full details</button> : null}
    </div>
  ),
}));

describe("ProductFeedbackPage — Feedbucket module switched off", () => {
  it("hides the capture actions and does not read submissions when the module is disabled", () => {
    const { useModuleEnabled } = jest.requireMock("@/hooks/api/access") as { useModuleEnabled: jest.Mock };
    useModuleEnabled.mockReturnValue(false);
    usePageState.mockReturnValue({ kind: "module-disabled", moduleKey: "feedbucket" });
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);

    render(<ProductFeedbackPage managedProductId={7} />);

    expect(screen.queryByRole("button", { name: "Capture feedback" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Collect via Feedbucket" })).not.toBeInTheDocument();
    expect(useFeedbucketSubmissions).toHaveBeenCalledWith(expect.anything(), { enabled: false });
    useModuleEnabled.mockReturnValue(true);
  });

  it("shows the capture actions when the module is on", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.getByRole("button", { name: "Capture feedback" })).toBeInTheDocument();
  });
});

describe("ProductFeedbackPage — usePageState integration (BSN-01-012)", () => {
  it("uses the table's matching mobile-card skeleton while the feedback list loads", () => {
    usePageState.mockReturnValue({ kind: "loading" });
    useFeedbucketSubmissions.mockReturnValue({
      ...EMPTY_FEEDBUCKET_RESULT,
      isLoading: true,
    });

    render(<ProductFeedbackPage managedProductId={7} />);

    expect(screen.getByTestId("data-table-skeleton")).toHaveAttribute("data-mobile-cards", "true");
  });

  it("opens desktop filter overflow in a popover instead of a drawer", async () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    const { baseElement } = render(<ProductFeedbackPage managedProductId={7} />);

    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));

    const overlay = await screen.findByRole("dialog");
    expect(overlay).not.toHaveAttribute("data-slot", "drawer-content");
    expect(baseElement.querySelector('[data-slot="drawer-content"]')).toBeNull();
  });

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

  it("opens the feedback pane in place when a row is clicked", () => {
    useFeedbucketSubmissions.mockReturnValue({
      ...EMPTY_FEEDBUCKET_RESULT,
      data: {
        data: [{ id: 41, message: "Broken export", widget: { projectId: null, managedProductId: 7 } }],
        total: 1,
      },
    });
    render(<ProductFeedbackPage managedProductId={7} />);
    screen.getByRole("button", { name: "Broken export" }).click();
    expect(mockRouterReplace).toHaveBeenCalledWith(
      expect.stringContaining("submission=41"),
      { scroll: false },
    );
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("opens the registered project-scoped detail route from the pane for a row owned by the active product", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("submission=41"));
    useFeedbucketSubmissions.mockReturnValue({
      ...EMPTY_FEEDBUCKET_RESULT,
      data: {
        data: [{ id: 41, message: "Broken export", widget: { projectId: 12, managedProductId: 7 } }],
        total: 1,
      },
    });
    render(<ProductFeedbackPage managedProductId={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Open full details" }));
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

  it("hides the full-details action when the destination route permission is denied", () => {
    useCan.mockImplementation((permission: string) => permission !== "feedbucket:widgets:view");
    mockUseSearchParams.mockReturnValue(new URLSearchParams("submission=41"));
    useFeedbucketSubmissions.mockReturnValue({
      ...EMPTY_FEEDBUCKET_RESULT,
      data: {
        data: [{ id: 41, message: "Restricted row", widget: { projectId: 12, managedProductId: 7 } }],
        total: 1,
      },
    });
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.getByTestId("feedback-pane")).toHaveAttribute("data-submission-id", "41");
    expect(screen.queryByRole("button", { name: "Open full details" })).not.toBeInTheDocument();
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
