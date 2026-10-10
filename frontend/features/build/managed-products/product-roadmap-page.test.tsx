import "./product-scope-pages.test-harness";
import { fireEvent } from "@testing-library/react";
import { ProductRoadmapPage } from "./product-roadmap-page";
import {
  mockUseSearchParams,
  render,
  screen,
  useCan,
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

  it("hides create actions from a viewer who cannot manage roadmap items", () => {
    useCan.mockImplementation((permission: string) => permission !== "build:roadmap:manage");
    const { unmount } = render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: /new item/i })).not.toBeInTheDocument();
    unmount();
    usePageState.mockReturnValue({ kind: "empty" });
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: /add roadmap item/i })).not.toBeInTheDocument();
  });

  it("shows the create action to an actor who can manage roadmap items", () => {
    useCan.mockImplementation((permission: string) => permission === "build:roadmap:manage");
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.getByRole("button", { name: /new item/i })).toBeInTheDocument();
  });

  it("shows the loading skeleton when usePageState resolves to loading", () => {
    usePageState.mockReturnValue({ kind: "loading" });
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.getByTestId("page-state-loading")).toBeInTheDocument();
    expect(screen.getByTestId("product-roadmap-skeleton")).toBeInTheDocument();
  });

  it("shows the error state when usePageState resolves to error", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("fail") });
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("renders the empty state inside the page state so filtered-empty is distinct from ready", () => {
    usePageState.mockReturnValue({ kind: "empty" });
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.getByTestId("page-state-empty")).toBeInTheDocument();
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("passes managedProductId to useRoadmapItems so the query is product-scoped", () => {
    render(<ProductRoadmapPage managedProductId={7} />);
    const [callParams] = useRoadmapItems.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ managedProductId: 7 });
  });

  it("passes horizon=now to useRoadmapItems when URL has horizon=now so the server filters by horizon", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("horizon=now"));
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(useRoadmapItems).toHaveBeenCalledWith(
      expect.objectContaining({ horizon: "now" }),
    );
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

describe("ProductRoadmapPage — confidenceMin URL param (BSN-RM-CONF)", () => {
  it("passes confidenceMin=50 to useRoadmapItems when URL has confidenceMin=50", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("confidenceMin=50"));
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(useRoadmapItems).toHaveBeenCalledWith(
      expect.objectContaining({ confidenceMin: 50 }),
    );
  });

  it("omits confidenceMin from useRoadmapItems when confidenceMin is not set in URL", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    render(<ProductRoadmapPage managedProductId={7} />);
    const [callParams] = useRoadmapItems.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("confidenceMin");
  });
});

describe("ProductRoadmapPage — view toggle (BSN-RM-VIEW)", () => {
  it("renders the board view by default with a Timeline button to switch", () => {
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.getByRole("button", { name: /timeline/i })).toBeInTheDocument();
    expect(screen.getByTestId("roadmap-board-columns")).toBeInTheDocument();
  });

  it("renders the roadmap-board-columns component when in board mode", () => {
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.getByTestId("roadmap-board-columns")).toBeInTheDocument();
    expect(screen.queryByTestId("roadmap-timeline-view")).not.toBeInTheDocument();
  });
});

describe("ProductRoadmapPage — public preview (BSN-RM-PREV)", () => {
  it("shows a Preview button to users who can manage roadmap items", () => {
    useCan.mockImplementation((permission: string) => permission === "build:roadmap:manage");
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.getByRole("button", { name: /preview/i })).toBeInTheDocument();
  });

  it("does not show the preview sheet before Preview is clicked", () => {
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.queryByTestId("roadmap-preview-sheet")).not.toBeInTheDocument();
  });

  it("shows the preview sheet when Preview is clicked", () => {
    useCan.mockImplementation((permission: string) => permission === "build:roadmap:manage");
    render(<ProductRoadmapPage managedProductId={7} />);
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));
    expect(screen.getByTestId("roadmap-preview-sheet")).toBeInTheDocument();
  });

  it("hides the Preview button from users who cannot manage roadmap items", () => {
    useCan.mockReturnValue(false);
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: /preview/i })).not.toBeInTheDocument();
  });
});

describe("ProductRoadmapPage — filters bar (BSN-RM-FILT)", () => {
  it("renders the filters bar component", () => {
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.getByTestId("roadmap-filters-bar")).toBeInTheDocument();
  });
});
