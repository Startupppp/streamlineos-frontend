import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { WfhApprovalsCard } from "../wfh-approvals-card";

const pending = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/hr", () => ({
  useHrPendingWfhRequests: () => pending(),
}));

jest.mock("@/hooks/api/hr/wfh-decisions", () => ({
  useDecideWfhRequest: () => ({ decide: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isError, error }: { isError: boolean; error: unknown }) =>
    isError ? { kind: "error", error } : { kind: "ready" },
}));

beforeEach(() => {
  jest.clearAllMocks();
  pending.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  });
});

describe("HRMS-005 the WFH approvals sub-query reports its own failure", () => {
  it("still shows the honest empty state when the read genuinely returns no rows", () => {
    render(<WfhApprovalsCard />);

    expect(screen.getByText(/no pending wfh requests/i)).toBeInTheDocument();
  });

  it("does not claim every WFH request has been processed when the sub-query failed", () => {
    pending.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    render(<WfhApprovalsCard />);

    expect(screen.queryByText(/no pending wfh requests/i)).toBeNull();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("retries the WFH read on its own card rather than reloading the leaves route", () => {
    pending.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    render(<WfhApprovalsCard />);
    screen.getByRole("button", { name: /try again/i }).click();

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
