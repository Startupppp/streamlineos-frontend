import { render, screen } from "@testing-library/react";
import { ApDocumentNewPage } from "../ap-document-new-page";

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(),
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: jest.fn(),
}));

jest.mock("@/hooks/api/accounting/ledger", () => ({
  useAccountingBook: jest.fn(),
}));

jest.mock("../bill-editor-form", () => ({
  BillEditorForm: () => <div>Bill editor</div>,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const { useAccess } = jest.requireMock("@/hooks/api/access") as {
  useAccess: jest.Mock;
};

const { useEntitlements } = jest.requireMock("@/hooks/api/entitlements") as {
  useEntitlements: jest.Mock;
};

const { useAccountingBook } = jest.requireMock("@/hooks/api/accounting/ledger") as {
  useAccountingBook: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  useEntitlements.mockReturnValue({ data: undefined });
  useAccountingBook.mockReturnValue({ data: undefined });
});

const PAGE_PROPS = {
  documentType: "BILL" as const,
  title: "New bill",
  subtitle: "Record a supplier bill.",
  backHref: "/accounting/purchase-bills",
  backLabel: "Back to bills",
};

describe("ApDocumentNewPage AP-9 guard", () => {
  it("does not flash a permission barrier while the access snapshot is still in flight — a permitted user must see a loading state, not a denial wall, before their rights arrive", () => {
    useAccess.mockReturnValue({ data: undefined, isLoading: true });

    render(<ApDocumentNewPage {...PAGE_PROPS} />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows a denial view once access resolves and the permission is genuinely absent", () => {
    useAccess.mockReturnValue({
      data: { modules: {}, scopes: {}, isOrgOwner: false },
      isLoading: false,
    });

    render(<ApDocumentNewPage {...PAGE_PROPS} />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders the bill editor form when access resolves and the permission is present", () => {
    useAccess.mockReturnValue({
      data: {
        modules: {},
        scopes: { "accounting:payables:manage": "all" },
        isOrgOwner: false,
      },
      isLoading: false,
    });

    render(<ApDocumentNewPage {...PAGE_PROPS} />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
    expect(screen.getByText("Bill editor")).toBeInTheDocument();
  });
});
