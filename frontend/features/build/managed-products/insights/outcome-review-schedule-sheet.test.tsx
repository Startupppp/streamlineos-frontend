import { createContext, forwardRef, useContext, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({
    id,
    value,
    onChange,
  }: {
    id: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      data-testid={`date-${id}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

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

jest.mock("@/components/ui/combobox", () => ({
  Combobox: function Combobox({
    options,
    onChange,
    "aria-label": ariaLabel,
  }: {
    options: Array<{ value: string; label: string }>;
    onChange: (v: string) => void;
    "aria-label"?: string;
  }) {
    return (
      <div role="combobox" aria-label={ariaLabel}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={false}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  },
}));

jest.mock("../use-infinite-selector", () => ({
  useInfiniteSelectorOpportunities: jest.fn(),
}));

const mockUseGoals = jest.fn();
jest.mock("@/hooks/api/goals", () => ({
  useGoals: (...args: unknown[]) => mockUseGoals(...args),
}));

import { OutcomeReviewScheduleSheet } from "./outcome-review-schedule-sheet";
import { useInfiniteSelectorOpportunities } from "../use-infinite-selector";

const mockUseInfiniteOps = useInfiniteSelectorOpportunities as jest.MockedFunction<
  typeof useInfiniteSelectorOpportunities
>;

const EMPTY_INFINITE = {
  data: undefined,
  isError: false,
  error: null,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
} as unknown as ReturnType<typeof useInfiniteSelectorOpportunities>;

beforeEach(() => {
  mockUseGoals.mockReturnValue({ data: [], isError: false, error: null, refetch: jest.fn() });
  mockUseInfiniteOps.mockReturnValue(EMPTY_INFINITE);
});

function withOpportunities(rows: Array<{ id: number; title: string }>) {
  mockUseInfiniteOps.mockReturnValue({
    data: { pages: [{ data: rows, pagination: { hasMore: false, nextCursor: null } }] },
    isError: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  } as unknown as ReturnType<typeof useInfiniteSelectorOpportunities>);
}

describe("OutcomeReviewScheduleSheet — opportunity link", () => {

  it("uses accessible required controls and visual asterisks without parenthetical label text", () => {
    render(
      <OutcomeReviewScheduleSheet
        managedProductId={39}
        open
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getByTestId("kind-select")).toHaveAttribute("aria-required", "true");
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveAttribute("aria-required", "true");
    expect(screen.queryByText(/\(required\)/i)).not.toBeInTheDocument();
    expect(document.querySelectorAll("label .text-destructive")).toHaveLength(2);
  });

  it("links the review to the chosen opportunity so it appears in that opportunity's trace", async () => {
    withOpportunities([
      { id: 1, title: "Export discoverability" },
      { id: 2, title: "Bulk edit" },
    ]);
    const onSubmit = jest.fn();
    const user = userEvent.setup();

    render(
      <OutcomeReviewScheduleSheet
        managedProductId={39}
        open
        onOpenChange={jest.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    expect(mockUseInfiniteOps).toHaveBeenCalledWith(39, expect.any(String), true);
    await user.type(screen.getByRole("textbox", { name: "Title" }), "Export adoption review");
    await user.click(screen.getByRole("option", { name: "Export discoverability" }));
    await user.click(screen.getByRole("button", { name: "Schedule" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "outcome_review",
          title: "Export adoption review",
          opportunityId: 1,
        }),
      ),
    );
  });

  it("omits the opportunity when the product has none so the form stays minimal", () => {
    withOpportunities([]);

    render(
      <OutcomeReviewScheduleSheet
        managedProductId={39}
        open
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.queryByTestId("opportunity-select")).not.toBeInTheDocument();
    expect(screen.queryByTestId("goal-select")).not.toBeInTheDocument();
  });

  it("shows an error state when opportunities fail to load and keeps the sheet open for retry", () => {
    mockUseInfiniteOps.mockReturnValue({
      data: undefined,
      isError: true,
      error: new Error("Network error"),
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useInfiniteSelectorOpportunities>);

    render(
      <OutcomeReviewScheduleSheet
        managedProductId={39}
        open
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Schedule" })).toBeInTheDocument();
  });
});

describe("OutcomeReviewScheduleSheet — goal link", () => {
  it("links the review to one of the product's goals so the goal lists it as an outcome", async () => {
    withOpportunities([]);
    mockUseGoals.mockReturnValue({
      data: [{ id: 38, title: "QA BV Goal" }],
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    const onSubmit = jest.fn();
    const user = userEvent.setup();

    render(
      <OutcomeReviewScheduleSheet
        managedProductId={39}
        open
        onOpenChange={jest.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    expect(mockUseGoals).toHaveBeenCalledWith(
      { managedProductId: 39, search: undefined },
      { enabled: true },
    );
    await user.type(screen.getByRole("textbox", { name: "Title" }), "Goal review");
    await user.click(screen.getByRole("option", { name: "QA BV Goal" }));
    await user.click(screen.getByRole("button", { name: "Schedule" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "outcome_review", title: "Goal review", goalId: 38 }),
      ),
    );
  });
});

describe("OutcomeReviewScheduleSheet — measurement fields", () => {
  it("includes measureKind measured and sourceUrl when the user fills them so the API receives the fields", async () => {
    withOpportunities([]);
    const onSubmit = jest.fn();
    const user = userEvent.setup();

    render(
      <OutcomeReviewScheduleSheet
        managedProductId={39}
        open
        onOpenChange={jest.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    await user.type(screen.getByRole("textbox", { name: "Title" }), "NPS review");
    await user.type(screen.getByTestId("metric-period-input"), "Q1 2025");
    await user.type(screen.getByTestId("source-url-input"), "https://example.com/data");
    await user.click(screen.getByRole("option", { name: "Measured" }));
    fireEvent.change(screen.getByTestId("date-scheduleMeasuredAt"), {
      target: { value: "2026-10-13" },
    });
    await user.click(screen.getByRole("button", { name: "Schedule" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "NPS review",
          measureKind: "measured",
          metricPeriod: "Q1 2025",
          sourceUrl: "https://example.com/data",
          measuredAt: "2026-10-13T00:00:00.000Z",
        }),
      ),
    );
  });

  it("keeps measured reviews client-side until source URL and measured date are present", async () => {
    withOpportunities([]);
    const onSubmit = jest.fn();
    const user = userEvent.setup();

    render(
      <OutcomeReviewScheduleSheet
        managedProductId={39}
        open
        onOpenChange={jest.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    await user.type(screen.getByRole("textbox", { name: "Title" }), "Measured review");
    await user.click(screen.getByRole("option", { name: "Measured" }));
    await user.click(screen.getByRole("button", { name: "Schedule" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Source URL is required for measured results")).toBeInTheDocument();
    expect(screen.getByText("Measured date is required for measured results")).toBeInTheDocument();
  });

  it("omits empty sourceUrl from submission so the API does not receive a blank string", async () => {
    withOpportunities([]);
    const onSubmit = jest.fn();
    const user = userEvent.setup();

    render(
      <OutcomeReviewScheduleSheet
        managedProductId={39}
        open
        onOpenChange={jest.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    await user.type(screen.getByRole("textbox", { name: "Title" }), "NPS review");
    await user.click(screen.getByRole("button", { name: "Schedule" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.not.objectContaining({ sourceUrl: expect.anything() }),
    );
  });
});
