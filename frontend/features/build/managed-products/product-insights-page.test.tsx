import "./product-scope-pages.test-harness";
import { ProductInsightsPage } from "./product-insights-page";
import {
  mockUseSearchParams,
  render,
  screen,
  useManagedProductInsights,
  usePageState,
} from "./product-scope-pages.test-harness";

describe("ProductInsightsPage — usePageState integration (BSN-01-022)", () => {
  beforeEach(() => {
    useManagedProductInsights.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it("calls usePageState with build:managed-products:view permission so 402 errors get classified correctly", () => {
    render(<ProductInsightsPage managedProductId={7} />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:managed-products:view" }),
    );
  });

  it("shows NoPermissionState when build:managed-products:view is denied", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });

  it("passes build:managed-products:view as the permission key in denied resolution", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "build:managed-products:view",
    );
  });
});

describe("ProductInsightsPage — page states (BSN-INS-STATE)", () => {
  beforeEach(() => {
    useManagedProductInsights.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it("shows the loading skeleton when usePageState resolves to loading so layout does not shift on first paint", () => {
    usePageState.mockReturnValue({ kind: "loading" });
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByTestId("page-state-loading")).toBeInTheDocument();
    expect(screen.getAllByTestId("stat-card-grid-skeleton").length).toBeGreaterThan(0);
  });

  it("shows the error state when usePageState resolves to error so the user can retry", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("network fail") });
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });
});

describe("ProductInsightsPage — range URL param (BSN-INS-RANGE)", () => {
  beforeEach(() => {
    useManagedProductInsights.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it("passes undefined range to useManagedProductInsights when no range param in URL so all-time data is shown by default", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    render(<ProductInsightsPage managedProductId={7} />);
    expect(useManagedProductInsights).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ range: undefined }),
    );
  });

  it("passes range=7d to useManagedProductInsights when URL has range=7d so the data is scoped to the last 7 days", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("range=7d"));
    render(<ProductInsightsPage managedProductId={7} />);
    expect(useManagedProductInsights).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ range: "7d" }),
    );
  });

  it("passes range=30d to useManagedProductInsights when URL has range=30d", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("range=30d"));
    render(<ProductInsightsPage managedProductId={7} />);
    expect(useManagedProductInsights).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ range: "30d" }),
    );
  });

  it("passes range=90d to useManagedProductInsights when URL has range=90d", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("range=90d"));
    render(<ProductInsightsPage managedProductId={7} />);
    expect(useManagedProductInsights).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ range: "90d" }),
    );
  });

  it("rejects an unknown range value and passes undefined so backend strict schema is not violated", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("range=invalid"));
    render(<ProductInsightsPage managedProductId={7} />);
    expect(useManagedProductInsights).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ range: undefined }),
    );
  });
});
