import React from "react";
import { render, screen } from "@testing-library/react";
import { CustomerDetailClient } from "../customer-detail-client";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/accounting/customers/party-1",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
    actions,
  }: {
    children: React.ReactNode;
    title?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      {title != null ? <h1>{String(title)}</h1> : null}
      {actions}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (
      resolution.kind === "denied" ||
      resolution.kind === "module-disabled" ||
      resolution.kind === "plan-required" ||
      resolution.kind === "module-denied"
    )
      return <div>Access Restricted</div>;
    return <div>{resolution.kind}</div>;
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(),
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: jest.fn(),
}));

jest.mock("@/hooks/api/accounting/parties", () => ({
  PARTIES_READ: "accounting:read",
  PARTIES_UPDATE: "accounting:update",
  useParty: jest.fn(),
}));

jest.mock("@/hooks/api/accounting/ar", () => ({
  RECEIVABLES_MANAGE: "accounting:receivables:manage",
  useArAging: jest.fn(),
  useArInvoices: jest.fn(),
}));

jest.mock("../party-form-sheet", () => ({
  PartyFormSheet: () => null,
}));

jest.mock("../party-tax-registrations-card", () => ({
  PartyTaxRegistrationsCard: () => null,
}));

jest.mock("../../sales/ar-labels", () => ({
  ArStatusBadge: () => null,
  PARTY_ROLE_LABEL: {},
}));

jest.mock("../../sales/use-list-url-state", () => ({
  useListUrlState: () => ({
    page: 1,
    pageSize: 10,
    setPage: jest.fn(),
    setPageSize: jest.fn(),
  }),
}));

const { useAccess, useCan } = jest.requireMock("@/hooks/api/access") as {
  useAccess: jest.Mock;
  useCan: jest.Mock;
};

const { useEntitlements } = jest.requireMock("@/hooks/api/entitlements") as {
  useEntitlements: jest.Mock;
};

const { useParty } = jest.requireMock("@/hooks/api/accounting/parties") as {
  useParty: jest.Mock;
};

const { useArAging, useArInvoices } = jest.requireMock("@/hooks/api/accounting/ar") as {
  useArAging: jest.Mock;
  useArInvoices: jest.Mock;
};

function setupQueries(): void {
  useParty.mockReturnValue({
    data: undefined,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  useArAging.mockReturnValue({ data: undefined, isLoading: false });
  useArInvoices.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
}

function loadCustomer(): void {
  useParty.mockReturnValue({
    data: {
      id: "party-1",
      displayName: "Acme Corp",
      legalName: "Acme Corporation Ltd",
      role: "CUSTOMER",
      email: "billing@acme.com",
      phone: null,
      defaultCurrency: "INR",
      paymentTermsDays: 30,
      countryCode: "IN",
      billingLine1: null,
      billingLine2: null,
      billingCity: null,
      billingPostalCode: null,
      billingCountryCode: null,
      notes: null,
      taxRegistrations: [],
      externalRefs: [],
      isActive: true,
    },
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
}

function grantRead(): void {
  useAccess.mockReturnValue({
    data: { modules: {}, scopes: { "accounting:read": "all" }, isOrgOwner: false },
    isLoading: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  useEntitlements.mockReturnValue({ data: undefined });
  useCan.mockReturnValue(false);
  setupQueries();
});

describe("CustomerDetailClient AP-9 guard", () => {
  it("does not flash a permission barrier while the access snapshot is still in flight — a permitted user must see a loading state, not a denial wall, before their rights arrive", () => {
    useAccess.mockReturnValue({ data: undefined, isLoading: true });

    render(<CustomerDetailClient partyId="party-1" />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows a denial view once access resolves and the permission is genuinely absent", () => {
    useAccess.mockReturnValue({
      data: { modules: {}, scopes: {}, isOrgOwner: false },
      isLoading: false,
    });

    render(<CustomerDetailClient partyId="party-1" />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders the customer detail when access resolves and the permission is present", () => {
    grantRead();
    loadCustomer();

    render(<CustomerDetailClient partyId="party-1" />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("withholds Edit details from a reader who cannot update the party", () => {
    grantRead();
    loadCustomer();
    useCan.mockImplementation((key: string) => key === "accounting:read");

    render(<CustomerDetailClient partyId="party-1" />);

    expect(screen.queryByRole("button", { name: /edit details/i })).not.toBeInTheDocument();
  });

  it("offers Edit details once the update key is held, proving the previous absence was the gate and not an unrendered page", () => {
    grantRead();
    loadCustomer();
    useCan.mockReturnValue(true);

    render(<CustomerDetailClient partyId="party-1" />);

    expect(screen.getByRole("button", { name: /edit details/i })).toBeInTheDocument();
  });

  it("withholds Edit details while the access snapshot is still in flight, because a control must fail closed even though the surface must not", () => {
    useAccess.mockReturnValue({ data: undefined, isLoading: true });
    loadCustomer();

    render(<CustomerDetailClient partyId="party-1" />);

    expect(screen.queryByRole("button", { name: /edit details/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });
});
