import { render, screen } from "@testing-library/react";
import { InvoicesPageClient } from "../invoices-page-client";

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(),
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: jest.fn(),
}));

jest.mock("@/hooks/api/accounting/ar", () => ({
  RECEIVABLES_READ: "accounting:receivables:read",
  RECEIVABLES_MANAGE: "accounting:receivables:manage",
  useArInvoices: jest.fn(),
  useArAging: jest.fn(),
}));

jest.mock("../../parties/use-party-names", () => ({
  usePartyNames: () => ({ resolve: (id: string) => `Party ${id}` }),
}));

jest.mock("../use-list-url-state", () => ({
  useListUrlState: () => ({
    get: jest.fn().mockReturnValue(""),
    page: 1,
    pageSize: 20,
    setParams: jest.fn(),
    setPage: jest.fn(),
    setPageSize: jest.fn(),
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (val: string) => val,
}));

const { useAccess, useCan } = jest.requireMock("@/hooks/api/access") as {
  useAccess: jest.Mock;
  useCan: jest.Mock;
};

const { useEntitlements } = jest.requireMock("@/hooks/api/entitlements") as {
  useEntitlements: jest.Mock;
};

const { useArInvoices, useArAging } = jest.requireMock("@/hooks/api/accounting/ar") as {
  useArInvoices: jest.Mock;
  useArAging: jest.Mock;
};

function setupQueries(): void {
  useArInvoices.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  useArAging.mockReturnValue({ data: undefined, isLoading: false });
}

beforeEach(() => {
  jest.clearAllMocks();
  useEntitlements.mockReturnValue({ data: undefined });
  useCan.mockReturnValue(false);
  setupQueries();
});

describe("InvoicesPageClient AP-9 guard", () => {
  it("does not flash a permission barrier while the access snapshot is still in flight — a permitted user must see a loading state, not a denial wall, before their rights arrive", () => {
    useAccess.mockReturnValue({ data: undefined, isLoading: true });

    render(<InvoicesPageClient />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows a denial view once access resolves and the permission is genuinely absent", () => {
    useAccess.mockReturnValue({
      data: { modules: {}, scopes: {}, isOrgOwner: false },
      isLoading: false,
    });

    render(<InvoicesPageClient />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders the invoices table when access resolves and the permission is present", () => {
    useAccess.mockReturnValue({
      data: {
        modules: {},
        scopes: { "accounting:receivables:read": "all" },
        isOrgOwner: false,
      },
      isLoading: false,
    });

    render(<InvoicesPageClient />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
    expect(screen.getByText("Invoices")).toBeInTheDocument();
  });
});
