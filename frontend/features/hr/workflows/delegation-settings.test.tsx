import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { DelegationSettings } from "./delegation-settings";

const HOOKS = join(process.cwd(), "hooks/api/hr/hr-workflows.ts");

const myDelegations = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/hr/hr-workflows", () => ({
  useMyDelegations: () => myDelegations(),
  useCreateDelegation: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteDelegation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: () => <div data-testid="user-combobox" />,
}));

function noop(): void {}

beforeEach(() => {
  jest.clearAllMocks();
  myDelegations.mockReturnValue({ data: [], isLoading: false });
});

describe("the My delegations dialog", () => {
  it("opens instead of throwing the Radix empty-value error that broke the Approvals page", () => {
    expect(() => render(<DelegationSettings open onOpenChange={noop} />)).not.toThrow();
    expect(screen.getByText("My delegations")).toBeInTheDocument();
  });

  it("offers the all-types choice through a non-empty sentinel Radix will accept", () => {
    render(<DelegationSettings open onOpenChange={noop} />);
    expect(screen.getByText("All types")).toBeInTheDocument();
  });
});

describe("the My delegations dialog distinguishes a failed load from no delegations", () => {
  it("offers retry on a failed load instead of 'No active delegations'", () => {
    myDelegations.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    render(<DelegationSettings open onOpenChange={noop} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load delegations/i);
    expect(screen.queryByText(/no active delegations/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the failed delegations read inline instead of throwing it to the /hr boundary", () => {
    const source = readFileSync(HOOKS, "utf8");

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(source).toContain("...INLINE_READ_ERROR,");
  });

  it("still says there are no active delegations when the read genuinely returned none", () => {
    render(<DelegationSettings open onOpenChange={noop} />);

    expect(screen.getByText(/no active delegations/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("the failed read's request id is quotable to support", () => {
  it("renders the copyable reference the backend echoed on the error envelope", () => {
    myDelegations.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, { correlationId: "req-abc123" }),
      refetch,
    });
    render(<DelegationSettings open onOpenChange={noop} />);
    expect(screen.getByText(/reference/i)).toBeInTheDocument();
    expect(screen.getByText("req-abc123")).toBeInTheDocument();
  });
});
