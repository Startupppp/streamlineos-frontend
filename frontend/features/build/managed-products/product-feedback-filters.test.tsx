import "./product-scope-pages.test-harness";
import { ProductFeedbackPage } from "./product-feedback-page";
import { buildFeedbackColumnsWithActions } from "./product-feedback-columns";
import type { SubmissionRow } from "./product-feedback-columns";
import {
  EMPTY_FEEDBUCKET_RESULT,
  mockUseSearchParams,
  render,
  screen,
  useCan,
  useFeedbucketSubmissions,
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

describe("buildFeedbackColumnsWithActions — route-to-intake column factory (BLD-014)", () => {
  const row: SubmissionRow = {
    id: 55, message: "Widget crashes on mobile", type: "bug", status: "open",
    createdAt: null, screenshotUrl: null, reporterName: "Alice", reporterEmail: null,
    allowedActions: ["intake"],
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
    allowedActions: ["intake"],
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

describe("buildFeedbackColumnsWithActions — allowedActions per-row gating (fail closed)", () => {
  const makeRow = (allowedActions: string[]): SubmissionRow =>
    ({
      id: 99, message: "Row action gate test", type: "idea", status: "open",
      createdAt: null, screenshotUrl: null, reporterName: null, reporterEmail: null,
      allowedActions,
      widget: { projectId: 10, managedProductId: 7 },
    } as unknown as SubmissionRow);

  it("hides Intake button when row allowedActions does not include intake", () => {
    const cols = buildFeedbackColumnsWithActions({ canRouteToIntake: true, onRouteToIntake: jest.fn() });
    const actionsCol = cols.find((c) => c.key === "actions");
    const { container } = render(actionsCol!.cell(makeRow(["view", "update"])));
    expect(container.querySelector("[data-testid='route-to-intake-btn']")).toBeNull();
  });

  it("shows Intake button when row allowedActions includes intake", () => {
    const cols = buildFeedbackColumnsWithActions({ canRouteToIntake: true, onRouteToIntake: jest.fn() });
    const actionsCol = cols.find((c) => c.key === "actions");
    const { getByTestId } = render(actionsCol!.cell(makeRow(["intake", "view"])));
    expect(getByTestId("route-to-intake-btn")).toBeInTheDocument();
  });

  it("hides Intake button when row allowedActions is empty (fails closed)", () => {
    const cols = buildFeedbackColumnsWithActions({ canRouteToIntake: true, onRouteToIntake: jest.fn() });
    const actionsCol = cols.find((c) => c.key === "actions");
    const { container } = render(actionsCol!.cell(makeRow([])));
    expect(container.querySelector("[data-testid='route-to-intake-btn']")).toBeNull();
  });
});
