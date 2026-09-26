import { render, screen } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { LabelsSettings } from "./labels-settings";

let mockAccessState: AccessState = "denied";
let mockPageState: PageStateResolution = { kind: "ready" };

jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => permission === "build:manage" && mockAccessState === "granted",
  useCanState: () => "granted" as const,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => mockPageState,
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    children,
    loading,
  }: {
    resolution: { kind: string };
    children: React.ReactNode;
    loading?: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution.kind === "denied") return <div data-testid="page-denied" />;
    if (resolution.kind === "error") return <div data-testid="page-error" />;
    return <>{children}</>;
  },
}));

jest.mock("@/hooks/api/build/labels", () => ({
  useOrgLabels: () => ({
    data: [
      { id: 1, orgId: "org-1", name: "Bug", color: "#ff0000" },
      { id: 2, orgId: "org-1", name: "Feature", color: "#00ff00" },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCreateLabel: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateLabel: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteLabel: () => ({ mutate: jest.fn(), isPending: false }),
}));

beforeEach(() => {
  mockAccessState = "denied";
  mockPageState = { kind: "ready" };
});

describe("LabelsSettings — build:manage gates", () => {
  it("shows the Add Label button when the viewer holds build:manage", () => {
    mockAccessState = "granted";
    render(<LabelsSettings />);
    expect(screen.getByRole("button", { name: /add label/i })).toBeInTheDocument();
  });

  it("hides the Add Label button when the viewer lacks build:manage", () => {
    render(<LabelsSettings />);
    expect(screen.queryByRole("button", { name: /add label/i })).not.toBeInTheDocument();
  });

  it("shows a Delete button on every label row when the viewer holds build:manage", () => {
    mockAccessState = "granted";
    render(<LabelsSettings />);
    expect(screen.getAllByRole("button", { name: "Delete label" })).toHaveLength(2);
  });

  it("hides all Delete buttons when the viewer lacks build:manage", () => {
    render(<LabelsSettings />);
    expect(screen.queryByRole("button", { name: "Delete label" })).not.toBeInTheDocument();
  });

  it("shows an edit control on every label row when the viewer holds build:manage", () => {
    mockAccessState = "granted";
    render(<LabelsSettings />);
    expect(screen.getByRole("button", { name: "Edit label Bug" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit label Feature" })).toBeInTheDocument();
  });

  it("hides edit controls on label rows when the viewer lacks build:manage so the list is read-only", () => {
    render(<LabelsSettings />);
    expect(screen.queryByRole("button", { name: /edit label/i })).not.toBeInTheDocument();
  });

  it("still renders every label name when the viewer lacks build:manage", () => {
    render(<LabelsSettings />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });

  it("hides Add Label while the access snapshot is in flight, because a mutation control that appears and then vanishes offers authority the caller may not hold", () => {
    mockAccessState = "loading";
    render(<LabelsSettings />);
    expect(screen.queryByRole("button", { name: /add label/i })).not.toBeInTheDocument();
  });
});

describe("LabelsSettings — page state transitions", () => {
  it("renders the loading skeleton and not label names while the page state is loading", () => {
    mockPageState = { kind: "loading" };
    render(<LabelsSettings />);
    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
  });

  it("renders the denied view and not label names when access is refused", () => {
    mockPageState = { kind: "denied", permission: "build:view" };
    render(<LabelsSettings />);
    expect(screen.getByTestId("page-denied")).toBeInTheDocument();
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
  });

  it("renders the error view and not label names when the data fetch fails", () => {
    mockPageState = { kind: "error", error: new Error("network failure") };
    render(<LabelsSettings />);
    expect(screen.getByTestId("page-error")).toBeInTheDocument();
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
  });

  it("renders label names in the ready state", () => {
    mockPageState = { kind: "ready" };
    render(<LabelsSettings />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });
});
