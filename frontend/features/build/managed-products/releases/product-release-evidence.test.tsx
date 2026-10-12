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
  evidence: {
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

    expect(screen.getByRole("heading", { name: "Incidents" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Approval state" })).toBeInTheDocument();
    expect(screen.getByText("approved")).toBeInTheDocument();
  });

  it("the detail view says no canonical release is linked when evidence is null", () => {
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
