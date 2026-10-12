import { createContext, forwardRef, useContext, type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

jest.mock("@/hooks/api/build/product-discovery", () => ({
  useOpportunities: jest.fn(),
}));

const mockUseGoals = jest.fn();
jest.mock("@/hooks/api/goals", () => ({
  useGoals: (...args: unknown[]) => mockUseGoals(...args),
}));

import { OutcomeReviewScheduleSheet } from "./outcome-review-schedule-sheet";
import { useOpportunities } from "@/hooks/api/build/product-discovery";

const mockUseOpportunities = useOpportunities as jest.MockedFunction<typeof useOpportunities>;

beforeEach(() => mockUseGoals.mockReturnValue({ data: [] }));

function withOpportunities(rows: Array<{ id: number; title: string }>) {
  mockUseOpportunities.mockReturnValue({
    data: { data: rows, pagination: { limit: 25, hasMore: false, nextCursor: null } },
  } as unknown as ReturnType<typeof useOpportunities>);
}

describe("OutcomeReviewScheduleSheet — opportunity link", () => {

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

    expect(mockUseOpportunities).toHaveBeenCalledWith(39, undefined, { enabled: true });
    await user.type(screen.getByLabelText("Title (required)"), "Export adoption review");
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
});

describe("OutcomeReviewScheduleSheet — goal link", () => {
  it("links the review to one of the product's goals so the goal lists it as an outcome", async () => {
    withOpportunities([]);
    mockUseGoals.mockReturnValue({ data: [{ id: 38, title: "QA BV Goal" }] });
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

    expect(mockUseGoals).toHaveBeenCalledWith({ managedProductId: 39, limit: 100 }, { enabled: true });
    await user.type(screen.getByLabelText("Title (required)"), "Goal review");
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

    await user.type(screen.getByLabelText("Title (required)"), "NPS review");
    await user.type(screen.getByTestId("metric-period-input"), "Q1 2025");
    await user.type(screen.getByTestId("source-url-input"), "https://example.com/data");
    await user.click(screen.getByRole("option", { name: "Measured" }));
    await user.click(screen.getByRole("button", { name: "Schedule" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "NPS review",
          measureKind: "measured",
          metricPeriod: "Q1 2025",
          sourceUrl: "https://example.com/data",
        }),
      ),
    );
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

    await user.type(screen.getByLabelText("Title (required)"), "NPS review");
    await user.click(screen.getByRole("button", { name: "Schedule" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.not.objectContaining({ sourceUrl: expect.anything() }),
    );
  });
});
