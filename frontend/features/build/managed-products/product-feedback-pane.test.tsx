import "./product-scope-pages.test-harness";
import { fireEvent } from "@testing-library/react";
import { ProductFeedbackPage } from "./product-feedback-page";
import { SOURCE_CHANNEL_FILTER_OPTIONS, FEEDBACK_COLUMNS } from "./product-feedback-columns";
import {
  EMPTY_FEEDBUCKET_RESULT,
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

jest.mock("./feedback/capture-submission-sheet", () => ({
  CaptureSubmissionSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="capture-sheet" /> : null,
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
