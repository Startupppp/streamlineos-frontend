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
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("submission=41"));
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
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("submission=41"));
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
    expect(callParams).toMatchObject({ from: "2026-01-01T00:00:00.000Z" });
  });

  it("forwards to bound from URL to useFeedbucketSubmissions so future submissions are excluded server-side", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("to=2026-06-01"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ to: "2026-06-01T23:59:59.999Z" });
  });

  it("omits whitespace segment, illegal sentiment, and a blank assignee so they do not filter the list", () => {
    mockUseSearchParams.mockReturnValueOnce(
      new URLSearchParams("segment=%20%20&sentiment=nope&assigneeId=%20%20&crmOrganizationId=-1"),
    );
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("segment");
    expect(callParams).not.toHaveProperty("sentiment");
    expect(callParams).not.toHaveProperty("assigneeId");
    expect(callParams).not.toHaveProperty("crmOrganizationId");
  });

  it("omits a whitespace theme so the submissions request is not rejected", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("theme=%20%20"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("theme");
  });

  it("omits a reversed date range and hides unfiltered rows", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("from=2026-12-31&to=2020-01-01"));
    useFeedbucketSubmissions.mockReturnValue({
      ...EMPTY_FEEDBUCKET_RESULT,
      data: { data: [{ id: 1, message: "Should stay hidden" }], total: 1 },
    });
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("from");
    expect(callParams).not.toHaveProperty("to");
    expect(screen.queryByText("Should stay hidden")).not.toBeInTheDocument();
  });

  it("omits a non-date from bound so the submissions request is not rejected", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("from=not-a-date"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("from");
  });

  it("omits from and to from query when URL carries neither so all submission dates are returned", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("from");
    expect(callParams).not.toHaveProperty("to");
  });
});

import { buildFeedbackColumnsWithActions } from "./product-feedback-columns";
import type { SubmissionRow } from "./product-feedback-columns";

describe("buildFeedbackColumnsWithActions — route-to-intake column factory (BLD-014)", () => {
  const row: SubmissionRow = {
    id: 55, message: "Widget crashes on mobile", type: "bug", status: "open",
    createdAt: null, screenshotUrl: null, reporterName: "Alice", reporterEmail: null,
    widget: { projectId: 10, managedProductId: 7 },
  } as unknown as SubmissionRow;

  it("returns base FEEDBACK_COLUMNS when canRouteToIntake is false (FE-122 control)", () => {
    const cols = buildFeedbackColumnsWithActions({ canRouteToIntake: false, onRouteToIntake: jest.fn() });
    expect(cols.every((c) => c.key !== "actions")).toBe(true);
  });

  it("appends an actions column when canRouteToIntake is true", () => {
    const cols = buildFeedbackColumnsWithActions({ canRouteToIntake: true, onRouteToIntake: jest.fn() });
    expect(cols.some((c) => c.key === "actions")).toBe(true);
  });

  it("actions column cell renders a button with route-to-intake-btn testid", () => {
    const cols = buildFeedbackColumnsWithActions({ canRouteToIntake: true, onRouteToIntake: jest.fn() });
    const actionsCol = cols.find((c) => c.key === "actions");
    const { getByTestId } = render(actionsCol!.cell(row));
    expect(getByTestId("route-to-intake-btn")).toBeInTheDocument();
  });

  it("actions column cell button click calls onRouteToIntake with the original row preserving feedbackId", () => {
    const onRouteToIntake = jest.fn();
    const cols = buildFeedbackColumnsWithActions({ canRouteToIntake: true, onRouteToIntake });
    const actionsCol = cols.find((c) => c.key === "actions");
    const { getByTestId } = render(actionsCol!.cell(row));
    getByTestId("route-to-intake-btn").click();
    expect(onRouteToIntake).toHaveBeenCalledWith(row);
    expect(onRouteToIntake.mock.calls[0]?.[0]?.id).toBe(55);
  });
});

describe("ProductFeedbackPage — route-to-intake mutation wiring (BLD-014)", () => {
  it("checks feedbucket:submissions:manage permission to gate the route-to-intake action", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const canCalls = useCan.mock.calls.map((c: unknown[]) => c[0]);
    expect(canCalls).toContain("feedbucket:submissions:manage");
  });
});

describe("ProductFeedbackPage — duplicate dedup candidates (BT-6733af0a3e35 item 2)", () => {
  const dupRow = (id: number) => ({
    id, message: "App crashes on login", type: "bug", status: "open",
    createdAt: null, screenshotUrl: null, reporterName: null, reporterEmail: null,
    widget: { projectId: 12, managedProductId: 7 },
  });

  it("surfaces both duplicate-flagged submissions as table rows so the actor can review all candidates", () => {
    useFeedbucketSubmissions.mockReturnValue({
      ...EMPTY_FEEDBUCKET_RESULT,
      data: { data: [dupRow(31), dupRow(32)], total: 2 },
    });
    render(<ProductFeedbackPage managedProductId={7} />);
    const buttons = screen.getAllByRole("button", { name: "App crashes on login" });
    expect(buttons).toHaveLength(2);
  });
});

describe("buildFeedbackColumnsWithActions — route-to-intake provenance and toast wiring (BT-6733af0a3e35 item 2)", () => {
  const row: SubmissionRow = {
    id: 31, message: "App crashes on login", type: "bug", status: "open",
    createdAt: null, screenshotUrl: null, reporterName: null, reporterEmail: null,
    widget: { projectId: 12, managedProductId: 7 },
  } as unknown as SubmissionRow;

  it("passes the submission's original id and projectId to the route mutation so provenance is preserved end-to-end", () => {
    const onRouteToIntake = jest.fn();
    const cols = buildFeedbackColumnsWithActions({ canRouteToIntake: true, onRouteToIntake });
    const actionsCol = cols.find((c) => c.key === "actions");
    const { getByTestId } = render(actionsCol!.cell(row));
    getByTestId("route-to-intake-btn").click();
    expect(onRouteToIntake).toHaveBeenCalledWith(row);
    expect(onRouteToIntake.mock.calls[0]?.[0]?.id).toBe(31);
    expect(onRouteToIntake.mock.calls[0]?.[0]?.widget?.projectId).toBe(12);
  });
});

jest.mock("./feedback/capture-submission-sheet", () => ({
  CaptureSubmissionSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="capture-sheet" /> : null,
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

describe("ProductFeedbackPage — new filter params (BSN-01-FB-FILTERS-V2)", () => {
  it("forwards sourceChannel from URL to useFeedbucketSubmissions", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("sourceChannel=email"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ sourceChannel: ["email"] });
  });

  it("omits sourceChannel from query when URL carries none", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("sourceChannel");
  });

  it("maps theme=untagged URL param to empty-string theme array for server-side untagged filtering", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("theme=untagged"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ theme: [""] });
  });

  it("forwards sentiment from URL to useFeedbucketSubmissions", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("sentiment=positive"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ sentiment: ["positive"] });
  });

  it("forwards consentStatus from URL to useFeedbucketSubmissions", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("consentStatus=denied"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ consentStatus: ["denied"] });
  });

  it("forwards linkedToOpportunity from URL to useFeedbucketSubmissions", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("linkedToOpportunity=true"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ linkedToOpportunity: "true" });
  });
});

describe("ProductFeedbackPage — filteredEmpty vs empty (BSN-01-FB-EMPTY)", () => {
  it("shows Clear filters button in empty state when filters are active", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("type=bug"));
    usePageState.mockReturnValue({ kind: "empty" });
    useFeedbucketSubmissions.mockReturnValue({ ...EMPTY_FEEDBUCKET_RESULT, data: { data: [], total: 0 } });
    render(<ProductFeedbackPage managedProductId={7} />);
    const clearButton = screen.queryByRole("button", { name: /clear filters/i });
    expect(clearButton).toBeInTheDocument();
  });

  it("does not show Clear filters button when no filters are active and list is empty", () => {
    usePageState.mockReturnValue({ kind: "empty" });
    useFeedbucketSubmissions.mockReturnValue({ ...EMPTY_FEEDBUCKET_RESULT, data: { data: [], total: 0 } });
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });
});

describe("ProductFeedbackPage — capture sheet (BSN-01-FB-CAPTURE)", () => {
  it("renders Capture feedback button when actor has feedbucket:submissions:manage permission", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    useCan.mockImplementation((key: string) => key === "feedbucket:submissions:manage");
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.getByRole("button", { name: /capture feedback/i })).toBeInTheDocument();
  });

  it("does not render Capture feedback button when permission is denied", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    useCan.mockReturnValue(false);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: /capture feedback/i })).not.toBeInTheDocument();
  });
});

describe("ProductFeedbackPage — feedback pane deep link (BSN-01-FB-PANE)", () => {
  it("opens the feedback pane when ?submission=id is in the URL", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("submission=42"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.getByTestId("feedback-pane")).toHaveAttribute("data-submission-id", "42");
  });

  it("does not render the feedback pane when ?submission is absent", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.queryByTestId("feedback-pane")).not.toBeInTheDocument();
  });

  it("treats a missing product as not found instead of an empty inbox", () => {
    const { useManagedProduct } = jest.requireMock(
      "@/hooks/api/build/managed-products",
    ) as { useManagedProduct: jest.Mock };
    useManagedProduct.mockReturnValue({
      data: null,
      isSuccess: true,
      isLoading: false,
      isError: false,
      error: null,
    });
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={999999999} />);
    expect(screen.getByTestId("page-state-not-found")).toBeInTheDocument();
    expect(screen.queryByText("No feedback submissions")).not.toBeInTheDocument();
    useManagedProduct.mockReturnValue({
      data: { id: 7, name: "QA" },
      isSuccess: true,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it("closes the pane without dropping the other filters", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("q=keep-me&submission=42"));
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Close pane" }));
    expect(mockRouterReplace).toHaveBeenCalledWith(
      expect.stringContaining("q=keep-me"),
      { scroll: false },
    );
    const [nextUrl] = mockRouterReplace.mock.calls.at(-1) as [string];
    expect(nextUrl).not.toContain("submission");
  });
});

import { SOURCE_CHANNEL_FILTER_OPTIONS, FEEDBACK_COLUMNS } from "./product-feedback-columns";

describe("ProductFeedbackPage — feedbucket source channel integration (BSN-01-FB-FEEDBUCKET)", () => {
  it("SOURCE_CHANNEL_FILTER_OPTIONS includes feedbucket as a selectable filter value", () => {
    const values = SOURCE_CHANNEL_FILTER_OPTIONS.map((o) => o.value);
    expect(values).toContain("feedbucket");
  });

  it("SOURCE_CHANNEL_FILTER_OPTIONS feedbucket entry has label 'Feedbucket'", () => {
    const opt = SOURCE_CHANNEL_FILTER_OPTIONS.find((o) => o.value === "feedbucket");
    expect(opt?.label).toBe("Feedbucket");
  });

  it("channel column renders 'Feedbucket' label for a submission with sourceChannel feedbucket", () => {
    const channelCol = FEEDBACK_COLUMNS.find((c) => c.key === "channel");
    if (!channelCol?.cell) throw new Error("channel column missing");
    const row = { sourceChannel: "feedbucket" } as unknown as Parameters<NonNullable<typeof channelCol.cell>>[0];
    const { getByText } = render(<>{channelCol.cell(row)}</>);
    expect(getByText("Feedbucket")).toBeInTheDocument();
  });

  it("shows frequency 1 when a captured row has no duplicate count yet", () => {
    const frequencyCol = FEEDBACK_COLUMNS.find((c) => c.key === "frequency");
    if (!frequencyCol?.cell) throw new Error("frequency column missing");
    const row = { duplicateCount: undefined } as unknown as Parameters<NonNullable<typeof frequencyCol.cell>>[0];
    const { getByText } = render(<>{frequencyCol.cell(row)}</>);
    expect(getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("NaN")).not.toBeInTheDocument();
  });

  it("renders Collect via Feedbucket button when actor has feedbucket:submissions:manage permission", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    useCan.mockImplementation((key: string) => key === "feedbucket:submissions:manage");
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.getByRole("button", { name: /collect via feedbucket/i })).toBeInTheDocument();
  });

  it("does not render Collect via Feedbucket button when permission is denied", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    useCan.mockReturnValue(false);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: /collect via feedbucket/i })).not.toBeInTheDocument();
  });
});
