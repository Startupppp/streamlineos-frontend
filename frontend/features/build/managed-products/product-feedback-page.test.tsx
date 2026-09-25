import "./product-scope-pages.test-harness";
import { ProductFeedbackPage } from "./product-feedback-page";
import {
  EMPTY_FEEDBUCKET_RESULT,
  mockRouterPush,
  render,
  screen,
  useCan,
  useFeedbucketSubmissions,
  usePageState,
} from "./product-scope-pages.test-harness";

describe("ProductFeedbackPage — usePageState integration (BSN-01-012)", () => {
  it("calls usePageState with feedbucket:submissions:view permission so 402 errors get classified correctly", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "feedbucket:submissions:view" }),
    );
  });

  it("shows NoPermissionState when feedbucket:submissions:view is denied", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "feedbucket:submissions:view" });
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes feedbucket:submissions:view as the permission key in denied resolution (BSN-01-012)", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "feedbucket:submissions:view" });
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "feedbucket:submissions:view",
    );
  });

  it("passes managedProductId to useFeedbucketSubmissions so the query is product-scope-filtered (BSN-01-012)", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ managedProductId: 7 });
  });

  it("opens the registered project-scoped detail route for a row owned by the active product", () => {
    useFeedbucketSubmissions.mockReturnValue({
      ...EMPTY_FEEDBUCKET_RESULT,
      data: {
        data: [{ id: 41, message: "Broken export", widget: { projectId: 12, managedProductId: 7 } }],
        total: 1,
      },
    });
    render(<ProductFeedbackPage managedProductId={7} />);
    screen.getByRole("button", { name: "Broken export" }).click();
    expect(mockRouterPush).toHaveBeenCalledWith("/build/12/feedbucket/41");
  });

  it.each([
    ["missing project", { id: 41, widget: { projectId: null, managedProductId: 7 } }],
    ["zero project", { id: 41, widget: { projectId: 0, managedProductId: 7 } }],
    ["nonpositive submission", { id: -1, widget: { projectId: 12, managedProductId: 7 } }],
    ["different product", { id: 41, widget: { projectId: 12, managedProductId: 8 } }],
  ])("does not navigate for a %s row", (_label, row) => {
    useFeedbucketSubmissions.mockReturnValue({
      ...EMPTY_FEEDBUCKET_RESULT,
      data: { data: [{ ...row, message: "Unsafe row" }], total: 1 },
    });
    render(<ProductFeedbackPage managedProductId={7} />);
    screen.getByRole("button", { name: "Unsafe row" }).click();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("does not navigate when the destination route permission is denied", () => {
    useCan.mockImplementation((permission: string) => permission !== "feedbucket:widgets:view");
    useFeedbucketSubmissions.mockReturnValue({
      ...EMPTY_FEEDBUCKET_RESULT,
      data: {
        data: [{ id: 41, message: "Restricted row", widget: { projectId: 12, managedProductId: 7 } }],
        total: 1,
      },
    });
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: "Restricted row" })).not.toBeInTheDocument();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
