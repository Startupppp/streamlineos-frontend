import "./product-scope-pages.test-harness";
import { fireEvent } from "@testing-library/react";
import { ProductGoalsPage } from "./product-goals-page";
import {
  EMPTY_GOALS_PAGE_RESULT,
  mockRouterReplace,
  mockUseSearchParams,
  render,
  screen,
  useGoalsPage,
  usePageState,
} from "./product-scope-pages.test-harness";

function goalsPageResult(total: number, page: number) {
  return {
    data: {
      items: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Goal ${i + 1}`,
        level: "company",
        status: "on_track",
        progress: 50,
        owner: null,
        keyResultCount: 0,
      })),
      page,
      pageSize: 20,
      total,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

describe("ProductGoalsPage — usePageState integration (BSN-01-027)", () => {
  beforeEach(() => {
    useGoalsPage.mockReturnValue(EMPTY_GOALS_PAGE_RESULT);
  });

  it("calls usePageState with build:goals:view permission so 402 errors get classified correctly", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:goals:view" }),
    );
  });

  it("shows NoPermissionState when usePageState resolution is denied", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:goals:view" });
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes build:goals:view as the permission key in denied resolution (BSN-01-027)", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:goals:view" });
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "build:goals:view",
    );
  });

  it("passes managedProductId to useGoalsPage so the query is product-scope-filtered (BSN-01-022)", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ managedProductId: 7 });
  });

  it("passes page=1 and limit=20 so the backend paginates at the server rather than loading all rows (C4)", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ page: 1, limit: 20 });
  });

  it("forwards ownerId URL param to useGoalsPage so owner-filtered queries run server-side (BSN-01-028)", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("ownerId=user-abc"));
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ ownerId: "user-abc" });
  });

  it("omits ownerId from useGoalsPage params when the URL param is absent (BSN-01-029)", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("ownerId");
  });

  it("renders pagination controls so a user can advance past the first 20 goals (C4)", () => {
    useGoalsPage.mockReturnValue(goalsPageResult(45, 1));
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByRole("button", { name: /next page/i })).toBeInTheDocument();
  });
});

describe("ProductGoalsPage — URL-backed pagination (BSN-GOALS-PAGE-URL)", () => {
  afterEach(() => {
    mockUseSearchParams.mockImplementation(() => new URLSearchParams());
  });

  it("reads the page number from the URL so a deep link to page 3 fetches page 3 rather than page 1", () => {
    mockUseSearchParams.mockImplementation(() => new URLSearchParams("page=3"));
    useGoalsPage.mockReturnValue(goalsPageResult(80, 3));
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ page: 3, limit: 20 });
  });

  it("falls back to page 1 when the URL page value is not a positive integer", () => {
    mockUseSearchParams.mockImplementation(() => new URLSearchParams("page=not-a-number"));
    useGoalsPage.mockReturnValue(EMPTY_GOALS_PAGE_RESULT);
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ page: 1 });
  });

  it("falls back to page 1 when the URL page value is zero or negative", () => {
    mockUseSearchParams.mockImplementation(() => new URLSearchParams("page=-2"));
    useGoalsPage.mockReturnValue(EMPTY_GOALS_PAGE_RESULT);
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ page: 1 });
  });

  it("writes the next page into the URL instead of component state, so reload and back both restore the page", () => {
    useGoalsPage.mockReturnValue(goalsPageResult(45, 1));
    render(<ProductGoalsPage managedProductId={7} />);
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/build/managed-products/7/goals?page=2",
      { scroll: false },
    );
  });

  it("drops the page param from the URL when returning to page 1 rather than writing page=1", () => {
    mockUseSearchParams.mockImplementation(() => new URLSearchParams("page=2"));
    useGoalsPage.mockReturnValue(goalsPageResult(45, 2));
    render(<ProductGoalsPage managedProductId={7} />);
    fireEvent.click(screen.getByRole("button", { name: /previous page/i }));
    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/build/managed-products/7/goals",
      { scroll: false },
    );
  });

  it("preserves the active filter params when paging so page 2 is still filtered", () => {
    mockUseSearchParams.mockImplementation(
      () => new URLSearchParams("health=at_risk&page=1"),
    );
    useGoalsPage.mockReturnValue(goalsPageResult(45, 1));
    render(<ProductGoalsPage managedProductId={7} />);
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/build/managed-products/7/goals?health=at_risk&page=2",
      { scroll: false },
    );
  });
});

describe("ProductGoalsPage — health/due/scope URL params forwarded (BSN-FILTER-GOALS-02)", () => {
  beforeEach(() => {
    useGoalsPage.mockReturnValue(EMPTY_GOALS_PAGE_RESULT);
  });

  it("forwards health URL param to useGoalsPage so health-filtered queries run server-side", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("health=at_risk"));
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ health: "at_risk" });
  });

  it("omits health from useGoalsPage params when the URL param is absent", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("health");
  });

  it("forwards due URL param to useGoalsPage so due-date-filtered queries run server-side", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("due=overdue"));
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ due: "overdue" });
  });

  it("omits due from useGoalsPage params when the URL param is absent", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("due");
  });

  it("forwards scope URL param to useGoalsPage so scope-filtered queries run server-side", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("scope=product"));
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ scope: "product" });
  });

  it("omits scope from useGoalsPage params when the URL param is absent", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("scope");
  });
});
