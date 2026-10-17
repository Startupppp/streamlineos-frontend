import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import {
  INLINE_READ_ERROR,
  readErrorReachesBoundary,
} from "@/lib/query-error-policy";
import { ReferenceChecksTab } from "./reference-checks-tab";

const DETAIL_HOOKS = join(
  process.cwd(),
  "hooks/api/hr/recruitment/candidate-details.ts",
);

const referenceChecks = jest.fn();

jest.mock("@/hooks/api/hr/recruitment", () => ({
  useReferenceChecks: () => referenceChecks(),
  useCreateReferenceCheck: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateReferenceCheck: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteReferenceCheck: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const CORRELATION_ID = "req_7f3a91";

function failing(status: number, refetch: jest.Mock) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", status, undefined, {
      correlationId: CORRELATION_ID,
    }),
    refetch,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  referenceChecks.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
});

describe("HRMS follow-up #178 a failing reference-checks read reports itself as an error", () => {
  it("keeps the tab's own failure off the candidate route boundary", () => {
    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(
      readErrorReachesBoundary(new ApiError("Internal server error", 500), {
        state: { data: undefined },
      }),
    ).toBe(true);
    expect(readFileSync(DETAIL_HOOKS, "utf8")).toContain("...INLINE_READ_ERROR,");
  });

  it("announces the failure and offers a retry rather than drawing its own notice", () => {
    const refetch = jest.fn();
    referenceChecks.mockReturnValue(failing(500, refetch));
    render(<ReferenceChecksTab candidateId={5} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(CORRELATION_ID)).toBeInTheDocument();
    expect(screen.queryByText(/no reference checks yet/i)).toBeNull();
    screen.getByRole("button", { name: /try again/i }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still shows the honest empty state on a genuine zero-row read", () => {
    render(<ReferenceChecksTab candidateId={5} />);

    expect(screen.getByText(/no reference checks yet/i)).toBeInTheDocument();
  });
});
