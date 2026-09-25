import "./product-scope-pages.test-harness";
import { ProductGoalsPage } from "./product-goals-page";
import {
  EMPTY_GOALS_RESULT,
  render,
  screen,
  useGoals,
  usePageState,
} from "./product-scope-pages.test-harness";

describe("ProductGoalsPage — usePageState integration (BSN-01-027)", () => {
  it("calls usePageState with build:goals:view permission so 402 errors get classified correctly", () => {
    useGoals.mockReturnValue(EMPTY_GOALS_RESULT);
    render(<ProductGoalsPage managedProductId={7} />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:goals:view" }),
    );
  });

  it("shows NoPermissionState when usePageState resolution is denied", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:goals:view" });
    useGoals.mockReturnValue(EMPTY_GOALS_RESULT);
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes build:goals:view as the permission key in denied resolution (BSN-01-027)", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:goals:view" });
    useGoals.mockReturnValue(EMPTY_GOALS_RESULT);
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "build:goals:view",
    );
  });

  it("passes managedProductId to useGoals so the query is product-scope-filtered (BSN-01-022)", () => {
    useGoals.mockReturnValue(EMPTY_GOALS_RESULT);
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoals.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ managedProductId: 7 });
  });
});
