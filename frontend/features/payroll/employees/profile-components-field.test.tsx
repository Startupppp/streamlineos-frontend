import { render, screen } from "@testing-library/react";
import { ProfileComponentsField } from "./profile-components-field";

let mockScopes: Record<string, string> = {};

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({
    data: { isOrgOwner: false, scopes: mockScopes, modules: {} },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));
jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/payroll/components", () => ({
  usePayrollComponents: jest.fn(),
}));

const { usePayrollComponents } = jest.requireMock("@/hooks/api/payroll/components") as {
  usePayrollComponents: jest.Mock;
};

function read(items: unknown[] | undefined) {
  return {
    data: items === undefined ? undefined : { items, pagination: { hasMore: false } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

describe("ProfileComponentsField", () => {
  it("tells a member without catalog access they are denied, not that the catalog is empty", () => {
    mockScopes = {};
    // Disabled for them: no data, not loading, no error.
    usePayrollComponents.mockReturnValue(read(undefined));
    render(<ProfileComponentsField value={[]} onChange={jest.fn()} />);
    expect(screen.queryByText(/No active components yet/)).not.toBeInTheDocument();
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("says the catalog is empty only when the read succeeded empty", () => {
    mockScopes = { "payroll:components:view": "all" };
    usePayrollComponents.mockReturnValue(read([]));
    render(<ProfileComponentsField value={[]} onChange={jest.fn()} />);
    expect(screen.getByText(/No active components yet/)).toBeInTheDocument();
  });
});
