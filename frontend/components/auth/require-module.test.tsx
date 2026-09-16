import { render, screen } from "@testing-library/react";
import { RequireModule } from "./require-module";

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: jest.fn(),
}));

const { useAccess } = jest.requireMock("@/hooks/api/access") as {
  useAccess: jest.Mock;
};
const { useEntitlements } = jest.requireMock("@/hooks/api/entitlements") as {
  useEntitlements: jest.Mock;
};

function mockAccess(snapshot: { data: unknown; isLoading?: boolean }): void {
  useAccess.mockReturnValue({ data: snapshot.data, isLoading: snapshot.isLoading ?? false });
}

function mockEntitlements(snapshot: { data: unknown; isError?: boolean }): void {
  useEntitlements.mockReturnValue({ data: snapshot.data, isError: snapshot.isError ?? false });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEntitlements({ data: undefined });
});

describe("RequireModule", () => {
  it("shows a skeleton rather than a blank frame while access is resolving", () => {
    mockAccess({ data: undefined, isLoading: true });
    const { container } = render(
      <RequireModule module="kb">
        <div>body</div>
      </RequireModule>,
    );
    expect(container).not.toBeEmptyDOMElement();
    expect(screen.queryByText("body")).toBeNull();
  });

  it("offers an upgrade when the plan is what blocks the module", () => {
    mockAccess({ data: { modules: { payroll: false }, scopes: {}, isOrgOwner: false } });
    mockEntitlements({ data: { lockedModules: ["payroll"] } });
    render(
      <RequireModule module="payroll">
        <div>body</div>
      </RequireModule>,
    );
    expect(screen.getByRole("link", { name: /plan/i })).toHaveAttribute(
      "href",
      "/settings/billing",
    );
  });

  it("offers to manage modules, not to upgrade, when the org simply switched it off", () => {
    mockAccess({ data: { modules: { kb: false }, scopes: {}, isOrgOwner: false } });
    render(
      <RequireModule module="kb">
        <div>body</div>
      </RequireModule>,
    );
    expect(screen.getByRole("link", { name: /modules/i })).toHaveAttribute(
      "href",
      "/settings/modules",
    );
    expect(screen.queryByText("body")).toBeNull();
  });

  it("renders children once the module is enabled", () => {
    mockAccess({ data: { modules: { kb: true }, scopes: {}, isOrgOwner: false } });
    render(
      <RequireModule module="kb">
        <div>body</div>
      </RequireModule>,
    );
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});
