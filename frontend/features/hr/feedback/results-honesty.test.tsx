import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { ResultsTab } from "./results-tab";

const FEEDBACK_HOOKS = join(process.cwd(), "hooks/api/hr/feedback.ts");

const results = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/hr", () => ({
  useFeedbackResults: () => results(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: ({ onChange }: { onChange: (id: string) => void }) => (
    <button type="button" onClick={() => onChange("emp-1")}>
      Select employee
    </button>
  ),
}));

const OK = { isLoading: false, isError: false, error: null };

beforeEach(() => {
  jest.clearAllMocks();
  results.mockReturnValue({ ...OK, data: undefined, refetch });
});

function pickAnEmployee() {
  fireEvent.click(screen.getByRole("button", { name: /select employee/i }));
}

describe("HRMS-B2-019 the 360 results tab does not report no results for a failed read", () => {
  it("opts the results read out of the /hr boundary, so its inline branch is reachable at all", () => {
    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(readFileSync(FEEDBACK_HOOKS, "utf8")).toContain("...INLINE_READ_ERROR,");
  });

  it("renders an alert with retry rather than claiming the employee has no results", () => {
    results.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, {
      correlationId: "req-lane3",
    }),
      refetch,
    });
    render(<ResultsTab />);
    pickAnEmployee();

    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't load feedback results/i,
    );
    expect(screen.queryByText(/no results found/i)).toBeNull();
    expect(screen.getByText("req-lane3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still renders the result panel when the read genuinely returns a zero-request subject", () => {
    results.mockReturnValue({
      ...OK,
      data: { totalRequests: 0, completedRequests: 0, avgRating: undefined },
      refetch,
    });
    render(<ResultsTab />);
    pickAnEmployee();

    expect(screen.getByText(/360° feedback results/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("prompts for an employee before any read has been attempted", () => {
    render(<ResultsTab />);

    expect(
      screen.getByText(/select an employee to view 360° feedback results/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
