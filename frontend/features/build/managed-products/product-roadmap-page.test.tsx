import "./product-scope-pages.test-harness";
import { ProductRoadmapPage } from "./product-roadmap-page";
import {
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

  it("passes managedProductId to useRoadmapItems so the query is product-scoped", () => {
    render(<ProductRoadmapPage managedProductId={7} />);
    const [callParams] = useRoadmapItems.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ managedProductId: 7 });
  });
});
