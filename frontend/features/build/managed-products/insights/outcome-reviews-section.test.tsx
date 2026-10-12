import { createContext, forwardRef, useContext, type ReactNode } from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OutcomeReviewsSection } from "./outcome-reviews-section";
import type { DiscoveryReviewsListOutcomeReviewsResponse } from "@/contracts/build-contracts.generated";
import type { CreateOutcomeReviewInput } from "@/hooks/api/build/outcome-review-mutations";

const mockSelectContext = createContext<(value: string) => void>(() => {});

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: ReactNode;
    onValueChange?: (value: string) => void;
  }) => (
    <mockSelectContext.Provider value={onValueChange ?? (() => {})}>
      {children}
    </mockSelectContext.Provider>
  ),
  SelectTrigger: forwardRef<HTMLButtonElement, { children: ReactNode }>(
    function SelectTrigger({ children, ...props }, ref) {
      return (
        <button type="button" ref={ref} {...props}>
          {children}
        </button>
      );
    },
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: function SelectItem({ children, value }: { children: ReactNode; value: string }) {
    const onValueChange = useContext(mockSelectContext);
    return (
      <button type="button" role="option" aria-selected={false} onClick={() => onValueChange(value)}>
        {children}
      </button>
    );
  },
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({
    id,
    onChange,
  }: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    clearable?: boolean;
  }) => (
    <input
      data-testid={`date-picker-${id}`}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

jest.mock("./outcome-review-schedule-sheet", () => ({
  OutcomeReviewScheduleSheet: ({
    open,
    onOpenChange,
    onSubmit,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: CreateOutcomeReviewInput) => void;
    isSubmitting: boolean;
  }) => {
    if (!open) return null;
    return (
      <div data-testid="schedule-sheet">
        <button
          type="button"
          data-testid="submit-schedule"
          onClick={() => onSubmit({ kind: "experiment", title: "Test review" })}
        >
          Submit
        </button>
        <button
          type="button"
          data-testid="close-schedule"
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>
      </div>
    );
  },
}));

type ReviewRow = DiscoveryReviewsListOutcomeReviewsResponse["data"][number];

const SCHEDULED_REVIEW: ReviewRow = {
  id: 1,
  managedProductId: 10,
  opportunityId: 5,
  roadmapItemId: null,
  goalId: null,
  releaseId: null,
  kind: "outcome_review",
  title: "NPS impact review",
  state: "scheduled",
  result: null,
  hypothesis: null,
  metric: null,
  unit: null,
  baseline: null,
  target: null,
  actual: null,
  notes: null,
  ownerMembershipId: null,
  scheduledFor: null,
  completedAt: null,
  version: 1,
  createdBy: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  measureKind: "self_reported",
  metricPeriod: null,
  sourceUrl: null,
  measuredAt: null,
};

const noop = jest.fn();

describe("OutcomeReviewsSection — result required (BSN-OUTCOME-RESULT)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the complete button for a scheduled review so users can record outcomes", () => {
    render(
      <OutcomeReviewsSection
        managedProductId={10}
        reviews={[SCHEDULED_REVIEW]}
        isLoading={false}
        onCreate={noop}
        onComplete={noop}
        onDelete={noop}
        isCreating={false}
        isUpdating={false}
      />,
    );

    expect(screen.getByTestId("complete-review-btn-1")).toBeInTheDocument();
  });

  it("blocks submission and shows a validation error when result is absent so outcome reviews always carry a result", async () => {
    render(
      <OutcomeReviewsSection
        managedProductId={10}
        reviews={[SCHEDULED_REVIEW]}
        isLoading={false}
        onCreate={noop}
        onComplete={noop}
        onDelete={noop}
        isCreating={false}
        isUpdating={false}
      />,
    );

    fireEvent.click(screen.getByTestId("complete-review-btn-1"));
    fireEvent.click(screen.getByRole("button", { name: /^complete$/i }));

    await waitFor(() => {
      expect(screen.getByTestId("result-error")).toBeInTheDocument();
    });
    expect(noop).not.toHaveBeenCalledWith(expect.objectContaining({ result: expect.anything() }));
  });

  it("offers labelled actual and notes fields so the learning is recorded with the result", () => {
    render(
      <OutcomeReviewsSection
        managedProductId={10}
        reviews={[SCHEDULED_REVIEW]}
        isLoading={false}
        onCreate={noop}
        onComplete={noop}
        onDelete={noop}
        isCreating={false}
        isUpdating={false}
      />,
    );

    fireEvent.click(screen.getByTestId("complete-review-btn-1"));

    expect(screen.getByLabelText("Actual measurement (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes (optional)")).toBeInTheDocument();
  });

  it("shows the empty state when no reviews are present", () => {
    render(
      <OutcomeReviewsSection
        managedProductId={10}
        reviews={[]}
        isLoading={false}
        onCreate={noop}
        onComplete={noop}
        onDelete={noop}
        isCreating={false}
        isUpdating={false}
      />,
    );

    expect(screen.getByTestId("outcome-reviews-empty")).toBeInTheDocument();
  });
});

describe("OutcomeReviewRow — measure kind and source fields (BSN-OUTCOME-MEASURE)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows a Measured badge when measureKind is measured so the row is visually distinct from self-reported", () => {
    const review: ReviewRow = { ...SCHEDULED_REVIEW, id: 2, measureKind: "measured" };
    render(
      <OutcomeReviewsSection
        managedProductId={10}
        reviews={[review]}
        isLoading={false}
        onCreate={noop}
        onComplete={noop}
        onDelete={noop}
        isCreating={false}
        isUpdating={false}
      />,
    );
    expect(screen.getByTestId("measure-kind-badge-2")).toHaveTextContent("Measured");
  });

  it("shows a source link when sourceUrl is set so users can drill through to the data", () => {
    const review: ReviewRow = {
      ...SCHEDULED_REVIEW,
      id: 3,
      measureKind: "measured",
      sourceUrl: "https://example.com/data",
    };
    render(
      <OutcomeReviewsSection
        managedProductId={10}
        reviews={[review]}
        isLoading={false}
        onCreate={noop}
        onComplete={noop}
        onDelete={noop}
        isCreating={false}
        isUpdating={false}
      />,
    );
    const link = screen.getByTestId("source-url-link-3");
    expect(link).toHaveAttribute("href", "https://example.com/data");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows measuredAt date when the review has a measurement timestamp", () => {
    const review: ReviewRow = {
      ...SCHEDULED_REVIEW,
      id: 4,
      state: "completed",
      result: "met",
      measureKind: "measured",
      measuredAt: "2026-03-15T00:00:00Z",
    };
    render(
      <OutcomeReviewsSection
        managedProductId={10}
        reviews={[review]}
        isLoading={false}
        onCreate={noop}
        onComplete={noop}
        onDelete={noop}
        isCreating={false}
        isUpdating={false}
      />,
    );
    expect(screen.getByTestId("measured-at-4")).toBeInTheDocument();
  });
});

describe("CompleteReviewDialog — measuredAt ISO conversion (BSN-OUTCOME-MEASURE-TS)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("converts YYYY-MM-DD from the DatePicker to an ISO datetime string before calling onComplete", async () => {
    const onComplete = jest.fn();
    const user = userEvent.setup();
    render(
      <OutcomeReviewsSection
        managedProductId={10}
        reviews={[SCHEDULED_REVIEW]}
        isLoading={false}
        onCreate={noop}
        onComplete={onComplete}
        onDelete={noop}
        isCreating={false}
        isUpdating={false}
      />,
    );

    fireEvent.click(screen.getByTestId("complete-review-btn-1"));
    await user.click(screen.getByRole("option", { name: "Met" }));
    fireEvent.change(screen.getByTestId("date-picker-measuredAt"), {
      target: { value: "2026-03-15" },
    });
    await user.click(screen.getByRole("button", { name: /^complete$/i }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ measuredAt: "2026-03-15T00:00:00.000Z" }),
        expect.any(Function),
      );
    });
  });
});

describe("OutcomeReviewsSection — schedule form (BSN-SCHEDULE-FORM)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("clicking Schedule opens the form and does not immediately call onCreate", () => {
    const onCreate = jest.fn();
    render(
      <OutcomeReviewsSection
        managedProductId={10}
        reviews={[]}
        isLoading={false}
        onCreate={onCreate}
        onComplete={noop}
        onDelete={noop}
        isCreating={false}
        isUpdating={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /schedule/i }));

    expect(screen.getByTestId("schedule-sheet")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("submitting the schedule form calls onCreate with the entered values", async () => {
    const onCreate = jest.fn();
    render(
      <OutcomeReviewsSection
        managedProductId={10}
        reviews={[]}
        isLoading={false}
        onCreate={onCreate}
        onComplete={noop}
        onDelete={noop}
        isCreating={false}
        isUpdating={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /schedule/i }));
    fireEvent.click(screen.getByTestId("submit-schedule"));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({ kind: "experiment", title: "Test review" }, expect.any(Function));
    });
    expect(screen.getByTestId("schedule-sheet")).toBeInTheDocument();
    act(() => onCreate.mock.calls[0][1]());
    expect(screen.queryByTestId("schedule-sheet")).not.toBeInTheDocument();
  });
});
