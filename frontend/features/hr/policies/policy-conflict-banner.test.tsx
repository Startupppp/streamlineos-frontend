import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR, readErrorReachesBoundary } from "@/lib/query-error-policy";
import { PolicyConflictBanner } from "./policy-conflict-banner";

const HOOKS = join(process.cwd(), "hooks/api/hr/policies.ts");

const conflicts = jest.fn();
const refetch = jest.fn();
const access = jest.fn(() => "granted");

jest.mock("@/hooks/api/hr/policies", () => ({
  usePolicyConflicts: () => conflicts(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCanState: () => access(),
}));

function failing(status: number) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", status),
    refetch,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  access.mockReturnValue("granted");
  conflicts.mockReturnValue({
    data: { conflicts: [], canActivate: true },
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  });
});

describe("HRMS-B3-018 the absence of a conflict warning must not be mistaken for the absence of a conflict", () => {
  it("keeps the failed conflict check on the banner's own surface instead of throwing it to the /hr boundary", () => {
    const source = readFileSync(HOOKS, "utf8");

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(source).toContain("...INLINE_READ_ERROR,");
    expect(
      readErrorReachesBoundary(new ApiError("Internal server error", 500), {
        state: { data: undefined },
      }),
    ).toBe(true);
  });

  it("says the check failed, rather than rendering nothing, when the conflict read 500s", () => {
    conflicts.mockReturnValue(failing(500));
    render(<PolicyConflictBanner policyId={9} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't check policy conflicts/i);
  });

  it("renders no reassuring phrasing while the conflict read is erroring", () => {
    conflicts.mockReturnValue(failing(500));
    render(<PolicyConflictBanner policyId={9} />);

    expect(screen.queryByText(/no overlapping active policies/i)).toBeNull();
    expect(screen.queryByText(/ready to activate/i)).toBeNull();
  });

  it("retries the conflict check itself rather than reloading the policy route", () => {
    conflicts.mockReturnValue(failing(500));
    render(<PolicyConflictBanner policyId={9} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("says the draft was not checked when the read returned nothing at all, which used to render an empty banner", () => {
    conflicts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    render(<PolicyConflictBanner policyId={9} />);

    expect(screen.getByText(/policy conflicts not checked/i)).toBeInTheDocument();
    expect(screen.queryByText(/no overlapping active policies/i)).toBeNull();
  });

  it("says access is restricted rather than clear when hr:policies:view is denied (FE-49)", () => {
    access.mockReturnValue("denied");
    render(<PolicyConflictBanner policyId={9} />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText(/ready to activate/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("still says the draft is clear when the check genuinely found no conflicts", () => {
    render(<PolicyConflictBanner policyId={9} />);

    expect(screen.getByText(/ready to activate/i)).toBeInTheDocument();
    expect(screen.getByText(/no overlapping active policies/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still names a real conflict when the check found one", () => {
    conflicts.mockReturnValue({
      data: {
        conflicts: [
          {
            policyId: 9,
            otherPolicyId: 4,
            otherPolicyName: "Standard leave",
            severity: "blocking",
            reason: "equal priority",
          },
        ],
        canActivate: false,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    render(<PolicyConflictBanner policyId={9} />);

    expect(screen.getByText(/cannot activate/i)).toBeInTheDocument();
    expect(screen.getByText(/standard leave/i)).toBeInTheDocument();
  });
});

describe("the failed read's request id is quotable to support", () => {
  it("renders the copyable reference the backend echoed on the error envelope", () => {
    conflicts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, { correlationId: "req-abc123" }),
      refetch,
    });
    render(<PolicyConflictBanner policyId={9} />);
    expect(screen.getByText(/reference/i)).toBeInTheDocument();
    expect(screen.getByText("req-abc123")).toBeInTheDocument();
  });
});
