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

import { OutcomeReviewScheduleSheet } from "./outcome-review-schedule-sheet";
import { useOpportunities } from "@/hooks/api/build/product-discovery";

const mockUseOpportunities = useOpportunities as jest.MockedFunction<typeof useOpportunities>;

function withOpportunities(rows: Array<{ id: number; title: string }>) {
  mockUseOpportunities.mockReturnValue({
    data: { data: rows, pagination: { limit: 25, hasMore: false, nextCursor: null } },
  } as unknown as ReturnType<typeof useOpportunities>);
}

describe("OutcomeReviewScheduleSheet — opportunity link", () => {
  beforeEach(() => jest.clearAllMocks());

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
      expect(onSubmit).toHaveBeenCalledWith({
        kind: "outcome_review",
        title: "Export adoption review",
        opportunityId: 1,
      }),
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
  });
});
