import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProductProjectsPage } from "./product-projects-page";
import { PP_PREV_PARAM, STATUS_PARAM } from "./use-product-projects-page";

jest.mock("@/components/renderer/use-tenant-layout", () => ({ useTenantLayout: <T,>(l: T): T => l }));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ replace: jest.fn(), push: jest.fn() })),
  usePathname: jest.fn(() => "/build/managed-products/5/projects"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

const {
  useRouter: mockUseRouter,
  useSearchParams: mockUseSearchParams,
} = jest.requireMock("next/navigation") as {
  useRouter: jest.Mock;
  useSearchParams: jest.Mock;
};

const mockRouterReplace = jest.fn();
const mockRouterPush = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  usePermissionGate: jest.fn(() => ({ allowed: true, denied: false, pending: false })),
  useModuleEnabled: jest.fn(() => false),
}));

jest.mock("@/hooks/api/build/teams", () => ({
  useProjectTeams: jest.fn(() => ({ data: null })),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(() => ({ kind: "ready" })),
}));

const mockUseManagedProductProjects = jest.fn();
jest.mock("@/hooks/api/build/managed-product-projects", () => ({
  useManagedProductProjects: (...args: unknown[]) => mockUseManagedProductProjects(...args),
}));

const mockSetPrimaryMutate = jest.fn();
const mockUnlinkMutate = jest.fn();
jest.mock("@/hooks/api/build/use-link-project-managed-product", () => ({
  useUnlinkProjectManagedProduct: jest.fn(() => ({
    mutate: mockUnlinkMutate,
    isPending: false,
  })),
  useSetPrimaryProject: jest.fn(() => ({
    mutate: mockSetPrimaryMutate,
    isPending: false,
  })),
  useLinkProjectManagedProduct: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  useQuery: jest.fn(() => ({ data: null })),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    filters,
    actions,
  }: {
    children: React.ReactNode;
    filters?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      <div data-testid="page-wrapper-filters">{filters}</div>
      <div data-testid="page-wrapper-actions">{actions}</div>
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
    empty?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <div data-testid="loading">{loading}</div>;
    if (resolution.kind === "empty") return <div data-testid="empty-state">{empty}</div>;
    if (resolution.kind === "error") return <div data-testid="error-state" />;
    return <div data-testid="page-state-ready">{children}</div>;
  },
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({
    data,
    columns,
    pagination,
  }: {
    data?: Array<Record<string, unknown>>;
    columns?: Array<{ key: string; cell?: (row: Record<string, unknown>) => React.ReactNode }>;
    pagination?: { mode?: string; hasMore?: boolean; hasPrevious?: boolean; onNext?: () => void; onPrevious?: () => void };
  }) => (
    <div data-testid="data-table">
      {data?.map((row, i) => (
        <div key={String(row.id ?? i)} data-testid="project-row" data-id={String(row.id)}>
          {columns?.map((col) => (
            <div key={col.key} data-testid={`col-${col.key}`}>
              {col.cell ? col.cell(row) : null}
            </div>
          ))}
        </div>
      ))}
      {pagination?.hasPrevious && <button type="button" data-testid="prev-page" onClick={pagination.onPrevious}>Previous</button>}
      {pagination?.hasMore && <button type="button" data-testid="next-page" onClick={pagination.onNext}>Next</button>}
    </div>
  ),
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({
    title,
    onClearFilters,
  }: {
    title: string;
    filtersActive?: boolean;
    onClearFilters?: () => void;
  }) => (
    <div data-testid="empty-state-component">
      <span>{title}</span>
      {onClearFilters ? (
        <button type="button" onClick={onClearFilters}>
          Clear filters
        </button>
      ) : null}
    </div>
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
    title,
  }: {
    open: boolean;
    onConfirm: () => void;
    title: string;
    onOpenChange?: (open: boolean) => void;
    isPending?: boolean;
    confirmLabel?: string;
    destructive?: boolean;
    description?: string;
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        <button type="button" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    ) : null,
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: ({
    search,
    filters,
    onClearAll,
  }: {
    search?: { value: string; onValueChange: (v: string) => void; placeholder: string };
    filters?: Array<{ id: string; label: string; control: React.ReactNode }>;
    onClearAll?: () => void;
  }) => (
    <div data-testid="build-list-toolbar">
      {search ? (
        <input
          aria-label={search.placeholder}
          value={search.value}
          onChange={(e) => search.onValueChange(e.target.value)}
        />
      ) : null}
      {filters?.map((f) => (
        <div key={f.id} data-testid={`filter-${f.id}`}>
          {f.control}
        </div>
      ))}
      {onClearAll ? (
        <button type="button" onClick={onClearAll}>
          Clear all
        </button>
      ) : null}
    </div>
  ),
}));

jest.mock("@/features/build/shared/build-filter-select", () => ({
  BuildFilterSelect: ({
    label,
    value,
    onValueChange,
    options,
  }: {
    label: string;
    value: string;
    onValueChange: (v: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

jest.mock("@/features/build/shared/build-multi-filter-select", () => ({
  BuildMultiFilterSelect: ({
    label,
    values,
    onValuesChange,
    options,
  }: {
    label: string;
    values: string[];
    onValuesChange: (v: string[]) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <div data-testid={`multi-select-${label.toLowerCase()}`}>
      {options.map((o) => (
        <label key={o.value}>
          <input
            type="checkbox"
            aria-label={`${label}-${o.value}`}
            checked={values.includes(o.value)}
            onChange={() => {
              const next = values.includes(o.value)
                ? values.filter((v) => v !== o.value)
                : [...values, o.value];
              onValuesChange(next);
            }}
          />
          {o.label}
        </label>
      ))}
    </div>
  ),
}));

jest.mock("@/features/build/shared/build-header-actions", () => ({
  BuildHeaderActions: ({ actions }: { actions: Array<{ label: string; onSelect?: () => void }> }) => (
    <div data-testid="build-header-actions">
      {actions.map((a) => (
        <button key={a.label} type="button" onClick={a.onSelect}>
          {a.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("@/features/build/managed-products/managed-product-detail-layout", () => ({
  ManagedProductDetailShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ManagedProductDetailPrimarySection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS: "",
}));

jest.mock("@/components/illustrations", () => ({
  EmptyProjectsIllustration: () => null,
}));

jest.mock("next/dynamic", () => (_fn: () => Promise<unknown>) => {
  const Component = () => <div data-testid="link-existing-project-dialog" />;
  Component.displayName = "DynamicLinkExistingProjectDialog";
  return Component;
});

const EMPTY_RESULT = {
  data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 20 } },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

function makeRow(overrides: Partial<{
  id: number;
  name: string;
  key: string;
  status: string;
  contribution: { totalTickets: number; doneTickets: number; percent: number | null };
  allowedActions: string[];
  isPrimary: boolean;
}> = {}) {
  return {
    id: 1,
    name: "Alpha Project",
    key: "AP",
    status: "ACTIVE",
    isPrimary: false,
    ownerId: null,
    ownerMembershipId: null,
    managerMembershipId: null,
    startDate: null,
    endDate: null,
    nextMilestone: null,
    contribution: { totalTickets: 10, doneTickets: 5, percent: 50 },
    linkedRoadmapItemCount: 0,
    linkedGoals: [],
    revision: 1,
    sourceFreshness: "2026-01-01T00:00:00.000Z",
    allowedActions: ["view", "unlink", "setPrimary"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseManagedProductProjects.mockReturnValue(EMPTY_RESULT);
  mockUseSearchParams.mockReturnValue(new URLSearchParams());
  mockUseRouter.mockReturnValue({ replace: mockRouterReplace, push: mockRouterPush });
  const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as { usePageState: jest.Mock };
  usePageState.mockReturnValue({ kind: "ready" });
  const { useCan } = jest.requireMock("@/hooks/api/access") as { useCan: jest.Mock };
  useCan.mockReturnValue(true);
});

describe("ProductProjectsPage — filter params forwarded to server (BSN-PROJ-FILTERS)", () => {
  it("passes the status URL param to useManagedProductProjects so filtering runs server-side", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("pp_status=ACTIVE"));
    render(<ProductProjectsPage managedProductId={5} />);
    const [callParams] = mockUseManagedProductProjects.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ status: ["ACTIVE"] });
  });

  it("omits status from params when the URL param is absent", () => {
    render(<ProductProjectsPage managedProductId={5} />);
    const [callParams] = mockUseManagedProductProjects.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("status");
  });

  it("passes search to the server after debounce so the query filters at the API", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("pp_search=alpha"));
    render(<ProductProjectsPage managedProductId={5} />);
    const [callParams] = mockUseManagedProductProjects.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ search: "alpha" });
  });

  it("writes the status filter to the URL so the filtered view is shareable", () => {
    render(<ProductProjectsPage managedProductId={5} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Status-COMPLETED" }));
    expect(mockRouterReplace).toHaveBeenCalledWith(
      expect.stringContaining("pp_status=COMPLETED"),
      { scroll: false },
    );
  });

  it("resets cursor when status filter changes", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("cursor=abc"));
    render(<ProductProjectsPage managedProductId={5} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Status-ARCHIVED" }));
    const call = mockRouterReplace.mock.calls[0][0] as string;
    expect(call).not.toContain("cursor=");
  });
});

describe("ProductProjectsPage — filteredEmpty state (BSN-PROJ-FILTERED-EMPTY)", () => {
  it("shows a filter-clearing empty state when filters are active but results are empty", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("pp_status=COMPLETED"));
    mockUseManagedProductProjects.mockReturnValue({
      ...EMPTY_RESULT,
      data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 20 } },
    });
    const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as { usePageState: jest.Mock };
    usePageState.mockReturnValue({ kind: "empty" });
    render(<ProductProjectsPage managedProductId={5} />);
    expect(screen.getByText("No projects match filters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear filters/i })).toBeInTheDocument();
  });

  it("shows a non-filter empty state when no filters are active and results are empty", () => {
    const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as { usePageState: jest.Mock };
    usePageState.mockReturnValue({ kind: "empty" });
    render(<ProductProjectsPage managedProductId={5} />);
    expect(screen.getByText("No linked projects yet")).toBeInTheDocument();
  });
});

describe("ProductProjectsPage — unlink project confirm (BSN-PROJ-UNLINK)", () => {
  it("does not show a confirm dialog before the user requests unlink", () => {
    mockUseManagedProductProjects.mockReturnValue({
      ...EMPTY_RESULT,
      data: { data: [makeRow()], pagination: { hasMore: false, nextCursor: null, limit: 20 } },
    });
    render(<ProductProjectsPage managedProductId={5} />);
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });

  it("calls useUnlinkProjectManagedProduct so the hook is wired when the component mounts", () => {
    render(<ProductProjectsPage managedProductId={5} />);
    const { useUnlinkProjectManagedProduct } = jest.requireMock(
      "@/hooks/api/build/use-link-project-managed-product",
    ) as { useUnlinkProjectManagedProduct: jest.Mock };
    expect(useUnlinkProjectManagedProduct).toHaveBeenCalled();
  });
});

describe("ProductProjectsPage — primary project", () => {
  it("marks the project whose primary product this is, and offers Set primary only on the others", () => {
    mockUseManagedProductProjects.mockReturnValue({
      ...EMPTY_RESULT,
      data: {
        data: [
          makeRow({ id: 1, name: "Alpha Project", isPrimary: true, allowedActions: ["view", "unlink"] }),
          makeRow({ id: 2, name: "Beta Project", key: "BP" }),
        ],
        pagination: { hasMore: false, nextCursor: null, limit: 20 },
      },
    });
    render(<ProductProjectsPage managedProductId={5} />);

    expect(screen.getAllByText("Primary").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Make this the primary product for Alpha Project" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Make this the primary product for Beta Project" }));
    expect(mockSetPrimaryMutate).toHaveBeenCalledWith({ projectId: 2, managedProductId: 5 }, expect.any(Object));
  });
});

describe("ProductProjectsPage — contribution cell (BSN-PROJ-CONTRIBUTION)", () => {
  it("renders No tickets when totalTickets is 0 so the cell is never blank", () => {
    mockUseManagedProductProjects.mockReturnValue({
      ...EMPTY_RESULT,
      data: {
        data: [makeRow({ contribution: { totalTickets: 0, doneTickets: 0, percent: null } })],
        pagination: { hasMore: false, nextCursor: null, limit: 20 },
      },
    });
    render(<ProductProjectsPage managedProductId={5} />);
    expect(screen.getByText("No tickets", { selector: "span" })).toBeInTheDocument();
  });

  it("renders a percentage when totalTickets is non-zero", () => {
    mockUseManagedProductProjects.mockReturnValue({
      ...EMPTY_RESULT,
      data: {
        data: [makeRow({ contribution: { totalTickets: 10, doneTickets: 5, percent: 50 } })],
        pagination: { hasMore: false, nextCursor: null, limit: 20 },
      },
    });
    render(<ProductProjectsPage managedProductId={5} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});

describe("ProductProjectsPage — STATUS_PARAM export (BSN-PROJ-STATUS-PARAM)", () => {
  it("STATUS_PARAM is pp_status so Lane L1 and other callers can import the constant by name", () => {
    expect(STATUS_PARAM).toBe("pp_status");
  });

  it("an unknown pp_status value keeps isFiltered true so the filter chip remains visible", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("pp_status=UNKNOWN_VALUE"));
    render(<ProductProjectsPage managedProductId={5} />);
    expect(screen.getByRole("button", { name: /Clear all/i })).toBeInTheDocument();
  });

  it("passes no status to the API when pp_status is an unrecognised value so the query is not poisoned", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("pp_status=UNKNOWN_VALUE"));
    render(<ProductProjectsPage managedProductId={5} />);
    const [callParams] = mockUseManagedProductProjects.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).not.toHaveProperty("status");
  });
});

describe("ProductProjectsPage — cursor history (BSN-PROJ-CURSOR-HISTORY)", () => {
  it("PP_PREV_PARAM is pp_prev so the constant is importable", () => {
    expect(PP_PREV_PARAM).toBe("pp_prev");
  });

  it("next-page uses router.push so the browser back button returns to the previous page (BSN-PROJ-CURSOR-PUSH)", () => {
    mockUseManagedProductProjects.mockReturnValue({
      ...EMPTY_RESULT,
      data: { data: [], pagination: { hasMore: true, nextCursor: "cursor_p2", limit: 20 } },
    });
    render(<ProductProjectsPage managedProductId={5} />);
    fireEvent.click(screen.getByTestId("next-page"));
    expect(mockRouterPush).toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it("previous-page uses router.push so the browser forward button returns to the next page (BSN-PROJ-CURSOR-PREV-PUSH)", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("cursor=cursor_p2&pp_prev=0"));
    mockUseManagedProductProjects.mockReturnValue({
      ...EMPTY_RESULT,
      data: { data: [], pagination: { hasMore: true, nextCursor: "cursor_p3", limit: 20 } },
    });
    render(<ProductProjectsPage managedProductId={5} />);
    fireEvent.click(screen.getByTestId("prev-page"));
    expect(mockRouterPush).toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it("next-page encodes page1 sentinel in pp_prev so previous can recover the exact page (page1→page2)", () => {
    mockUseManagedProductProjects.mockReturnValue({
      ...EMPTY_RESULT,
      data: { data: [], pagination: { hasMore: true, nextCursor: "cursor_p2", limit: 20 } },
    });
    render(<ProductProjectsPage managedProductId={5} />);
    fireEvent.click(screen.getByTestId("next-page"));
    const call = mockRouterPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(call.includes("?") ? call.split("?")[1] : call);
    expect(params.get("cursor")).toBe("cursor_p2");
    expect(params.get("pp_prev")).toBe("0");
  });

  it("previous-page from page2 restores page1 (cursor cleared, pp_prev cleared) (BSN-PROJ-CURSOR-PREV-P1)", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("cursor=cursor_p2&pp_prev=0"));
    mockUseManagedProductProjects.mockReturnValue({
      ...EMPTY_RESULT,
      data: { data: [], pagination: { hasMore: true, nextCursor: "cursor_p3", limit: 20 } },
    });
    render(<ProductProjectsPage managedProductId={5} />);
    fireEvent.click(screen.getByTestId("prev-page"));
    const call = mockRouterPush.mock.calls[0][0] as string;
    expect(call).not.toContain("cursor=");
    expect(call).not.toContain("pp_prev=");
  });

  it("previous-page from page3 restores page2 cursor, not page1 (BSN-PROJ-CURSOR-PREV-P2)", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("cursor=cursor_p3&pp_prev=0%7Ccursor_p2"));
    mockUseManagedProductProjects.mockReturnValue({
      ...EMPTY_RESULT,
      data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 20 } },
    });
    render(<ProductProjectsPage managedProductId={5} />);
    fireEvent.click(screen.getByTestId("prev-page"));
    const call = mockRouterPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(call.includes("?") ? call.split("?")[1] : call);
    expect(params.get("cursor")).toBe("cursor_p2");
    expect(params.get("pp_prev")).toBe("0");
  });

  it("deep-link with cursor but no pp_prev shows Previous and Previous goes to page1 (BSN-PROJ-CURSOR-DEEP-LINK)", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("cursor=cursor_p2"));
    mockUseManagedProductProjects.mockReturnValue({
      ...EMPTY_RESULT,
      data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 20 } },
    });
    render(<ProductProjectsPage managedProductId={5} />);
    expect(screen.getByTestId("prev-page")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("prev-page"));
    const call = mockRouterPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(call.includes("?") ? call.split("?")[1] : call);
    expect(params.get("cursor")).toBeNull();
    expect(params.get("pp_prev")).toBeNull();
  });
});
