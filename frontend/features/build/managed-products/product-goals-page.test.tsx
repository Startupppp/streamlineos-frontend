import "./product-scope-pages.test-harness";
import { fireEvent } from "@testing-library/react";
import { ProductGoalsPage } from "./product-goals-page";

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({
    ariaLabel,
    value,
    onChange,
  }: {
    ariaLabel?: string;
    value?: string;
    onChange: (value: string) => void;
  }) => (
    <input
      aria-label={ariaLabel}
      type="date"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));
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

  it("passes product scope to the create sheet, not just to the list", () => {
    render(<ProductGoalsPage managedProductId={39} />);
    expect(screen.getByTestId("goal-form-sheet")).toHaveAttribute("data-managed-product-id", "39");
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
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("due=2026-12-31"));
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ due: "2026-12-31" });
  });

  it("omits due from useGoalsPage params when the URL param is absent", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("due");
  });

  it("forwards scope URL param to useGoalsPage so scope-filtered queries run server-side", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("scope=own"));
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ scope: "own" });
  });

  it("omits scope from useGoalsPage params when the URL param is absent", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("scope");
  });
});

describe("ProductGoalsPage — health/due/scope filter controls (BSN-FILTER-GOALS-03)", () => {
  beforeEach(() => {
    useGoalsPage.mockReturnValue(EMPTY_GOALS_PAGE_RESULT);
  });

  it("renders a scope control so the deep-linkable scope param is reachable without editing the URL", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByLabelText("Scope")).toBeInTheDocument();
  });

  it("renders a health control so the deep-linkable health param is reachable without editing the URL", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByLabelText("Health")).toBeInTheDocument();
  });

  it("renders a native date control so the deep-linkable due param is reachable without editing the URL", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByLabelText("Due on or before")).toHaveAttribute(
      "type",
      "date",
    );
  });

  it("writes the picked due date to the URL so the filtered list is shareable", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    fireEvent.change(screen.getByLabelText("Due on or before"), {
      target: { value: "2026-12-31" },
    });
    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/build/managed-products/7/goals?due=2026-12-31",
      { scroll: false },
    );
  });

  it("clearing the date control drops the due param instead of writing an empty value", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("due=2026-12-31"));
    render(<ProductGoalsPage managedProductId={7} />);
    fireEvent.change(screen.getByLabelText("Due on or before"), {
      target: { value: "" },
    });
    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/build/managed-products/7/goals",
      { scroll: false },
    );
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  it("shows the deep-linked due date in the control so a shared link is legible", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("due=2026-12-31"));
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByLabelText("Due on or before")).toHaveValue("2026-12-31");
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });
});

describe("ProductGoalsPage — outcome params are validated before the request (BSN-FILTER-GOALS-04)", () => {
  beforeEach(() => {
    useGoalsPage.mockReturnValue(EMPTY_GOALS_PAGE_RESULT);
  });

  it("drops a health value the backend list schema does not accept so the read cannot 400", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("health=urgent"));
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("health");
  });

  it("drops a scope value the backend list schema does not accept so the read cannot 400", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("scope=product"));
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("scope");
  });

  it("drops a due value that is not an ISO date so the read cannot 400", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("due=overdue"));
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("due");
  });

  it("forwards the scope sentinel as absent so the default all-goals read is unfiltered", () => {
    mockUseSearchParams.mockReturnValueOnce(new URLSearchParams("scope=all"));
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoalsPage.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("scope");
  });
});

describe("ProductGoalsPage — offline state (BSN-STATE-GOALS-OFFLINE)", () => {
  const onlineSpy = jest.spyOn(navigator, "onLine", "get");

  afterEach(() => {
    onlineSpy.mockReturnValue(true);
  });

  it("renders no offline notice while the browser is online, so the banner is not permanent furniture", () => {
    onlineSpy.mockReturnValue(true);
    useGoalsPage.mockReturnValue({ ...EMPTY_GOALS_PAGE_RESULT, dataUpdatedAt: Date.now() });
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.queryByTestId("offline-notice")).not.toBeInTheDocument();
  });

  it("shows freshness rather than blanking the list when the browser goes offline", () => {
    onlineSpy.mockReturnValue(false);
    useGoalsPage.mockReturnValue({
      ...EMPTY_GOALS_PAGE_RESULT,
      data: { items: [], page: 1, pageSize: 20, total: 0 },
      dataUpdatedAt: Date.now(),
    });
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("offline-notice")).toHaveTextContent(/Offline — showing data/);
  });

  it("withdraws the create action while offline, because a goal write is not an idempotent command", () => {
    onlineSpy.mockReturnValue(false);
    useGoalsPage.mockReturnValue({ ...EMPTY_GOALS_PAGE_RESULT, dataUpdatedAt: Date.now() });
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.queryAllByRole("button", { name: /New Goal/i })).toHaveLength(0);
  });

  it("offers the create action again once online (FE-122 positive pair)", () => {
    onlineSpy.mockReturnValue(true);
    useGoalsPage.mockReturnValue({ ...EMPTY_GOALS_PAGE_RESULT, dataUpdatedAt: Date.now() });
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.queryAllByRole("button", { name: /New Goal/i }).length).toBeGreaterThan(0);
  });
});
