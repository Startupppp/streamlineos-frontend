import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ProductReleaseEvidenceSheet } from "./product-release-evidence-sheet";
import { buildReleaseDetail } from "./product-releases-test-fixtures";

const mockUseManagedProductRelease = jest.fn();
const mockUsePageState = jest.fn();
const mockRefetch = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/managed-products/7/releases",
  useSearchParams: () => new URLSearchParams(""),
}));

jest.mock("@/hooks/api/build/managed-product-releases", () => ({
  useManagedProductRelease: (...args: unknown[]) => mockUseManagedProductRelease(...args),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (options: unknown) => mockUsePageState(options),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    children,
    loading,
    onRetry,
  }: {
    resolution: { kind: string };
    children: ReactNode;
    loading?: ReactNode;
    onRetry?: () => void;
  }) => {
    if (resolution.kind === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution.kind === "error") return (
      <div data-testid="page-error">
        <button type="button" onClick={onRetry}>Retry</button>
      </div>
    );
    if (resolution.kind === "denied") return <div data-testid="no-permission" />;
    return <div data-testid="page-ready">{children}</div>;
  },
}));

const DETAIL_WITH_EVIDENCE = buildReleaseDetail({
  id: 5,
  name: "Q4 Release",
  version: "4.0.0",
  projectReleaseId: 99,
  projectRelease: {
    id: 99,
    name: "Sprint 9",
    version: "9.0.0",
    projectId: 11,
    projectName: "Billing Project",
    projectKey: "BILL",
  },
  evidence: {
    restricted: false,
    visibleTicketCount: 2,
    ticketCount: 2,
    tickets: [
      { ticketId: 1, ticketNumber: 42, title: "Fix login bug", status: "done" },
      { ticketId: 2, ticketNumber: 43, title: "Add dark mode", status: "in_progress" },
    ],
    testRunCount: 1,
    testRuns: [
      { id: 101, name: "Smoke suite", status: "passed" },
    ],
    incidentCount: 3,
    incidents: [
      { id: 301, title: "Checkout latency spike", severity: "high", status: "resolved" },
    ],
    approvalState: "approved",
  },
});

const DETAIL_WITHOUT_EVIDENCE = buildReleaseDetail({
  id: 5,
  name: "Q4 Release",
  version: "4.0.0",
  projectReleaseId: null,
  evidence: null,
});

function renderSheet(props: { releaseId?: number; open?: boolean } = {}) {
  return render(
    <ProductReleaseEvidenceSheet
      managedProductId={7}
      releaseId={props.releaseId ?? 5}
      open={props.open ?? true}
      onOpenChange={jest.fn()}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUseManagedProductRelease.mockReturnValue({
    data: DETAIL_WITH_EVIDENCE,
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
  });
});

describe("ProductReleaseEvidenceSheet", () => {
  it("uses a release-shaped loading state that mirrors evidence sections", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });
    mockUseManagedProductRelease.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    renderSheet();

    expect(screen.getByRole("status", { name: "Loading release evidence" })).toBeInTheDocument();
    expect(document.querySelectorAll("section")).toHaveLength(4);
  });

  it("the detail view renders ticket membership, test runs, incident count and approval state", () => {
    renderSheet();

    expect(screen.getByRole("list", { name: "Linked tickets" })).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    expect(screen.getByText("done")).toBeInTheDocument();
    expect(screen.getByText("#43")).toBeInTheDocument();
    expect(screen.getByText("Add dark mode")).toBeInTheDocument();

    expect(screen.getByRole("list", { name: "Test runs" })).toBeInTheDocument();
    expect(screen.getByText("Smoke suite")).toBeInTheDocument();
    expect(screen.getByText("passed")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Incidents (3)" })).toBeInTheDocument();
    expect(screen.getByText("Checkout latency spike")).toBeInTheDocument();
    expect(screen.getByText("2 more not shown here.")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Approval state" })).toBeInTheDocument();
    expect(screen.getByText("approved")).toBeInTheDocument();
  });

  it("says no canonical release is linked when evidence is null, instead of showing zeros that read as proven-empty evidence", () => {
    mockUseManagedProductRelease.mockReturnValue({
      data: DETAIL_WITHOUT_EVIDENCE,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });
    renderSheet();

    expect(screen.getByText("No canonical release linked")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Linked tickets" })).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Test runs" })).not.toBeInTheDocument();
  });

  it("links each evidence record to its owning project record and carries the return context back to this release", () => {
    renderSheet();

    const ret = encodeURIComponent("/build/managed-products/7/releases");
    expect(screen.getByRole("link", { name: "Fix login bug" })).toHaveAttribute(
      "href",
      `/build/11/tickets/BILL-42?ret=${ret}`,
    );
    expect(screen.getByRole("link", { name: "Smoke suite" })).toHaveAttribute(
      "href",
      `/build/11/qa/runs/101?ret=${ret}`,
    );
    expect(screen.getByRole("link", { name: "Checkout latency spike" })).toHaveAttribute(
      "href",
      `/build/11/incidents/301?ret=${ret}`,
    );
    expect(screen.getByRole("link", { name: "approved" })).toHaveAttribute(
      "href",
      `/build/11/approvals?ret=${ret}`,
    );
  });

  it("withholds evidence detail but keeps the real counts when the owning project is unreachable, so hidden evidence never reads as zero", () => {
    mockUseManagedProductRelease.mockReturnValue({
      data: {
        ...DETAIL_WITH_EVIDENCE,
        evidence: {
          restricted: true,
          ticketCount: 6,
          visibleTicketCount: 0,
          tickets: [],
          testRunCount: 2,
          testRuns: [],
          incidentCount: 3,
          incidents: [],
          approvalState: null,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUsePageState.mockReturnValue({ kind: "ready" });
    renderSheet();

    expect(screen.getByRole("heading", { name: "Tickets (6)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Incidents (3)" })).toBeInTheDocument();
    expect(screen.queryByText("No tickets linked.")).not.toBeInTheDocument();
    expect(screen.queryByText("No incidents recorded.")).not.toBeInTheDocument();
    expect(screen.queryByText("Not set")).not.toBeInTheDocument();
    expect(
      screen.getByText("Hidden — you do not have access to the owning project."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "6 records are linked. You do not have access to the owning project, so their detail is hidden.",
      ),
    ).toBeInTheDocument();
  });

  it("the detail view renders an error state with retry when the detail query fails", async () => {
    const user = userEvent.setup();
    mockUseManagedProductRelease.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });
    mockUsePageState.mockReturnValue({ kind: "error" });
    renderSheet();

    expect(screen.getByTestId("page-error")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(mockRefetch).toHaveBeenCalled();
  });
});
