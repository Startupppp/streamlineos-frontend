import { render, screen } from "@testing-library/react";
import { DelegationSettings } from "./delegation-settings";

const myDelegations = jest.fn();

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

describe("the My Delegations dialog", () => {
  it("opens instead of throwing the Radix empty-value error that broke the Approvals page", () => {
    expect(() => render(<DelegationSettings open onOpenChange={noop} />)).not.toThrow();
    expect(screen.getByText("My Delegations")).toBeInTheDocument();
  });

  it("offers the all-types choice through a non-empty sentinel Radix will accept", () => {
    render(<DelegationSettings open onOpenChange={noop} />);
    expect(screen.getByText("All types")).toBeInTheDocument();
  });
});
