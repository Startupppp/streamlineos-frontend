import { render, screen } from "@testing-library/react";
import { ReconciliationPage } from "../reconciliation-page";

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(),
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: jest.fn(),
}));

jest.mock("@/hooks/api/accounting/banking", () => ({
  useBankStatements: jest.fn(),
  useBankStatement: jest.fn(),
  useReconciliationProof: jest.fn(),
  useUnmatchStatementLine: jest.fn(),
  useMarkStatementReconciled: jest.fn(),
}));

jest.mock("../../lib/use-url-list-state", () => ({
  useUrlListState: () => ({
    getParam: jest.fn().mockReturnValue(null),
    setParams: jest.fn(),
    page: 1,
    setPage: jest.fn(),
  }),
}));

jest.mock("../match-suggestions-panel", () => ({
  MatchSuggestionsPanel: () => null,
}));

const mockRecProofProps: { canReconcile: boolean }[] = [];

jest.mock("../rec-proof-panel", () => ({
  RecProofPanel: (props: { canReconcile: boolean }) => {
    mockRecProofProps.push({ canReconcile: props.canReconcile });
    return null;
  },
}));

jest.mock("../statement-lines-panel", () => ({
  StatementLinesPanel: () => null,
}));

jest.mock("../unreconciled-split-view", () => ({
  UnreconciledSplitView: () => null,
}));

const { useAccess, useCan } = jest.requireMock("@/hooks/api/access") as {
  useAccess: jest.Mock;
  useCan: jest.Mock;
};

const { useEntitlements } = jest.requireMock("@/hooks/api/entitlements") as {
  useEntitlements: jest.Mock;
};

const {
  useBankStatements,
  useBankStatement,
  useReconciliationProof,
  useUnmatchStatementLine,
  useMarkStatementReconciled,
} = jest.requireMock("@/hooks/api/accounting/banking") as {
  useBankStatements: jest.Mock;
  useBankStatement: jest.Mock;
  useReconciliationProof: jest.Mock;
  useUnmatchStatementLine: jest.Mock;
  useMarkStatementReconciled: jest.Mock;
};

function setupBankingHooks(): void {
  useBankStatements.mockReturnValue({
    data: undefined,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  useBankStatement.mockReturnValue({ data: undefined, isPending: false });
  useReconciliationProof.mockReturnValue({ data: undefined, isError: false });
  useUnmatchStatementLine.mockReturnValue({ mutate: jest.fn(), isPending: false });
  useMarkStatementReconciled.mockReturnValue({ mutate: jest.fn(), isPending: false });
}

function renderTheProofPanel(): void {
  useBankStatements.mockReturnValue({
    data: {
      items: [
        { id: "s1", periodStart: "2024-01-01", periodEnd: "2024-01-31", reconciledAt: null },
      ],
    },
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  useReconciliationProof.mockReturnValue({
    data: { holds: true, reconciledAt: null, unmatchedStatementLines: [] },
    isError: false,
  });
}

function grantRead(): void {
  useAccess.mockReturnValue({
    data: { modules: {}, scopes: { "accounting:banking:read": "all" }, isOrgOwner: false },
    isLoading: false,
  });
  renderTheProofPanel();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRecProofProps.length = 0;
  useEntitlements.mockReturnValue({ data: undefined });
  useCan.mockReturnValue(false);
  setupBankingHooks();
});

describe("ReconciliationPage AP-9 guard", () => {
  it("does not flash a permission barrier while the access snapshot is still in flight — a permitted user must see a loading state, not a denial wall, before their rights arrive", () => {
    useAccess.mockReturnValue({ data: undefined, isLoading: true });

    render(<ReconciliationPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows a denial view once access resolves and the permission is genuinely absent", () => {
    useAccess.mockReturnValue({
      data: { modules: {}, scopes: {}, isOrgOwner: false },
      isLoading: false,
    });

    render(<ReconciliationPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders the page title when access resolves and the permission is present", () => {
    useAccess.mockReturnValue({
      data: {
        modules: {},
        scopes: { "accounting:banking:read": "all" },
        isOrgOwner: false,
      },
      isLoading: false,
    });

    render(<ReconciliationPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
    expect(screen.getByText("Is this money actually there?")).toBeInTheDocument();
  });

  it("denies the reconcile control to a reader who holds only the read key", () => {
    grantRead();
    useCan.mockImplementation((key: string) => key === "accounting:banking:read");

    render(<ReconciliationPage />);

    expect(mockRecProofProps).toHaveLength(1);
    expect(mockRecProofProps[0]?.canReconcile).toBe(false);
  });

  it("grants the reconcile control once the reconcile key is actually held, proving the previous denial was the gate and not an unrendered panel", () => {
    grantRead();
    useCan.mockReturnValue(true);

    render(<ReconciliationPage />);

    expect(mockRecProofProps).toHaveLength(1);
    expect(mockRecProofProps[0]?.canReconcile).toBe(true);
  });

  it("fails the reconcile control closed while the access snapshot is still in flight, unlike the surface which must wait rather than deny", () => {
    useAccess.mockReturnValue({
      data: { modules: {}, scopes: { "accounting:banking:read": "all" }, isOrgOwner: false },
      isLoading: true,
    });
    renderTheProofPanel();
    useCan.mockReturnValue(false);

    render(<ReconciliationPage />);

    expect(mockRecProofProps).toHaveLength(1);
    expect(mockRecProofProps[0]?.canReconcile).toBe(false);
    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });
});
