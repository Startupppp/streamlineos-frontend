import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { DelegationSettings } from "./delegation-settings";

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
});
