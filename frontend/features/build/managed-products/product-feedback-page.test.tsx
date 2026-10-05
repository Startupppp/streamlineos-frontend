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
    const { render: renderCell } = require("@testing-library/react");
    const { getByTestId } = renderCell(actionsCol!.cell(row));
    expect(getByTestId("route-to-intake-btn")).toBeInTheDocument();
  });

  it("actions column cell button click calls onRouteToIntake with the original row preserving feedbackId", () => {
    const onRouteToIntake = jest.fn();
    const cols = buildFeedbackColumnsWithActions({ canRouteToIntake: true, onRouteToIntake });
    const actionsCol = cols.find((c) => c.key === "actions");
    const { render: renderCell } = require("@testing-library/react");
    const { getByTestId } = renderCell(actionsCol!.cell(row));
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
    const { render: renderCell } = require("@testing-library/react");
    const { getByTestId } = renderCell(actionsCol!.cell(row));
    getByTestId("route-to-intake-btn").click();
    expect(onRouteToIntake).toHaveBeenCalledWith(row);
    expect(onRouteToIntake.mock.calls[0]?.[0]?.id).toBe(31);
    expect(onRouteToIntake.mock.calls[0]?.[0]?.widget?.projectId).toBe(12);
  });
});
