import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import {
  INLINE_READ_ERROR,
  readErrorReachesBoundary,
} from "@/lib/query-error-policy";
import type { RecruitmentVendor } from "@/hooks/api";
import { SubmissionSheet } from "./submission-sheet";

const VENDOR_HOOKS = join(process.cwd(), "hooks/api/hr/recruitment/vendors.ts");

const submissions = jest.fn();

jest.mock("@/hooks/api", () => ({
  useVendorSubmissions: () => submissions(),
  useCreateVendorSubmission: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateVendorSubmission: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/hr/recruitment/candidates", () => ({
  useCandidates: () => ({ data: [] }),
}));

jest.mock("@/hooks/api/hr/recruitment/jobs", () => ({
  useJobPostings: () => ({ data: [] }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const vendor = { id: 7, name: "Acme Staffing" } as RecruitmentVendor;

function noop(): void {}

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
  submissions.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
});

describe("HRMS-B3-011 a failing vendor-submissions read does not read as no submissions", () => {
  it("keeps the sheet's own failure off the vendors route boundary", () => {
    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(
      readErrorReachesBoundary(new ApiError("Internal server error", 500), {
        state: { data: undefined },
      }),
    ).toBe(true);
    expect(
      readFileSync(VENDOR_HOOKS, "utf8").match(/\.\.\.INLINE_READ_ERROR,/g) ?? [],
    ).toHaveLength(1);
  });

  it("shows an inline error with a retry instead of an empty list when the read 500s", () => {
    const refetch = jest.fn();
    submissions.mockReturnValue(failing(500, refetch));
    render(<SubmissionSheet vendor={vendor} onClose={noop} />);

    expect(screen.queryByText(/no submissions yet/i)).toBeNull();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(CORRELATION_ID)).toBeInTheDocument();
    screen.getByRole("button", { name: /try again/i }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still shows the honest empty state on a genuine zero-row read", () => {
    render(<SubmissionSheet vendor={vendor} onClose={noop} />);

    expect(screen.getByText(/no submissions yet/i)).toBeInTheDocument();
  });
});
