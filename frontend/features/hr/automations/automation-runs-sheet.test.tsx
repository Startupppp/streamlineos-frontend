import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { AutomationRunsSheet } from "./automation-runs-sheet";

const mockUseHrAutomationRuns = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/hr/hr-automations", () => ({
  useHrAutomationRuns: () => mockUseHrAutomationRuns(),
}));

function noop(): void {}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("the automation runs sheet distinguishes a failed load from an empty history", () => {
  it("offers retry on a failed load instead of 'No runs yet for this rule.'", () => {
    mockUseHrAutomationRuns.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    render(<AutomationRunsSheet ruleId={7} ruleName="Welcome email" onClose={noop} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load run history/i);
    expect(screen.queryByText(/no runs yet for this rule/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still shows the empty history when the rule really has not run", () => {
    mockUseHrAutomationRuns.mockReturnValue({
      data: { data: [], pagination: { nextCursor: null, hasMore: false } },
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    render(<AutomationRunsSheet ruleId={7} ruleName="Welcome email" onClose={noop} />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/no runs yet for this rule/i)).toBeInTheDocument();
  });
});
