import "./product-scope-pages.test-harness";
import { ProductRoadmapPage } from "./product-roadmap-page";
import {
  mockUseSearchParams,
  render,
  screen,
  usePageState,
  useRoadmapItems,
} from "./product-scope-pages.test-harness";

describe("ProductRoadmapPage — usePageState integration (BSN-01-027)", () => {
  it("calls usePageState with build:roadmap:view permission so 402 errors get classified correctly", () => {
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:roadmap:view" }),
    );
  });

  it("shows NoPermissionState when usePageState resolution is denied for roadmap view", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:roadmap:view" });
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("does not show create button when denied (BSN-01-027)", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:roadmap:view" });
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: /new item/i })).not.toBeInTheDocument();
  });

  it("shows the loading skeleton when usePageState resolves to loading", () => {
    usePageState.mockReturnValue({ kind: "loading" });
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.getByTestId("page-state-loading")).toBeInTheDocument();
  });

  it("shows the error state when usePageState resolves to error", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("fail") });
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("shows the empty state when usePageState resolves to empty", () => {
    usePageState.mockReturnValue({ kind: "empty" });
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("passes managedProductId to useRoadmapItems so the query is product-scoped", () => {
    render(<ProductRoadmapPage managedProductId={7} />);
    const [callParams] = useRoadmapItems.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ managedProductId: 7 });
  });

  it("does not pass horizon to useRoadmapItems because there is no DB column backing it (BSN-RM-001)", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("horizon=now"));
    render(<ProductRoadmapPage managedProductId={7} />);
    const [callParams] = useRoadmapItems.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("horizon");
  });
});

describe("ProductRoadmapPage — sort URL param (BSN-RM-SORT)", () => {
  it("passes sort=updated_at to useRoadmapItems when URL has sort=updated_at so items are ordered by last update", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("sort=updated_at"));
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(useRoadmapItems).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "updated_at" }),
    );
  });

  it("passes sort=created_at to useRoadmapItems when URL has sort=created_at", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("sort=created_at"));
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(useRoadmapItems).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "created_at" }),
    );
  });

  it("passes sort=title to useRoadmapItems when URL has sort=title", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("sort=title"));
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(useRoadmapItems).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "title" }),
    );
  });

  it("omits sort from useRoadmapItems when no sort param is in URL so the backend default order applies", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    render(<ProductRoadmapPage managedProductId={7} />);
    const [callParams] = useRoadmapItems.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("sort");
  });
});

describe("ProductRoadmapPage — status URL param (BSN-RM-STATUS)", () => {
  it("passes status=planned to useRoadmapItems when URL has status=planned", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("status=planned"));
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(useRoadmapItems).toHaveBeenCalledWith(
      expect.objectContaining({ status: "planned" }),
    );
  });

  it("omits status from useRoadmapItems when status is not set in URL", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    render(<ProductRoadmapPage managedProductId={7} />);
    const [callParams] = useRoadmapItems.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("status");
  });
});
