import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectSettingsViewsPage } from "./project-settings-views-page";

const makePage = (views: Array<{ id: number; name: string; layoutType: "list" | "board" | "calendar"; isPinned: boolean; ownerId?: string }>, hasMore = false) => ({
  data: views,
  pagination: { limit: 25, hasMore, nextCursor: hasMore ? "cursor-abc" : null },
});

let mockCanManage = true;
let mockQuery: {
  data?: ReturnType<typeof makePage>;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
} = { data: makePage([]), isLoading: false, isError: false };
const mockDeleteMutate = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockCanManage,
}));

jest.mock("@/hooks/api/build", () => ({
  useViews: () => ({ ...mockQuery, refetch: jest.fn() }),
  useUpdateView: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteView: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isLoading, isError, isEmpty }: { isLoading: boolean; isError: boolean; isEmpty: boolean }) =>
    isLoading ? "loading" : isError ? "error" : isEmpty ? "empty" : "ready",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ title, subtitle, actions, filters, children }: { title: string; subtitle: string; actions?: React.ReactNode; filters?: React.ReactNode; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actions}
      {filters}
      {children}
    </div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, loading, empty, children }: { resolution: string; loading: React.ReactNode; empty: React.ReactNode; children: React.ReactNode }) => {
    if (resolution === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution === "empty") return <div data-testid="page-empty">{empty}</div>;
    if (resolution === "error") return <div data-testid="page-error">Unable to load saved views</div>;
    return <div>{children}</div>;
  },
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) => (
    <div>
      <h2>{title}</h2>
      {action ? <button onClick={action.onClick}>{action.label}</button> : null}
    </div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({ Skeleton: () => <div data-testid="skeleton" /> }));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
}));

jest.mock("@/components/ui/table-pagination", () => ({
  TablePagination: () => <div data-testid="table-pagination" />,
  useCursorPager: () => ({ cursor: null, hasPrevious: false, goNext: jest.fn(), goPrevious: jest.fn() }),
}));

jest.mock("@/features/build/views/saved-views/view-card", () => ({
  ViewCard: ({
    view,
    isSelected,
    onToggleSelect,
  }: {
    view: { name: string; id: number };
    isSelected?: boolean;
    onToggleSelect?: (id: number, sel: boolean) => void;
  }) => (
    <div data-testid="view-card">
      {onToggleSelect ? (
        <input
          type="checkbox"
          data-testid={`select-view-${view.id}`}
          aria-label={`Select ${view.name}`}
          checked={isSelected ?? false}
          onChange={(e) => onToggleSelect(view.id, e.target.checked)}
        />
      ) : null}
      {view.name}
    </div>
  ),
}));

jest.mock("@/features/build/views/saved-views/create-view-sheet", () => ({
  CreateViewSheet: ({ open }: { open: boolean }) => (open ? <div role="dialog">Create saved view</div> : null),
}));

jest.mock("@/features/build/views/saved-views/rename-view-dialog", () => ({
  RenameViewDialog: () => null,
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
  }) =>
    open ? (
      <div role="alertdialog" aria-label={title}>
        <button onClick={onConfirm}>Confirm delete</button>
      </div>
    ) : null,
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: () => ({
    search: "",
    debouncedSearch: "",
    setSearch: jest.fn(),
    clearAll: jest.fn(),
    activeCount: 0,
    isFiltered: false,
    cursor: null,
    setCursor: jest.fn(),
    value: jest.fn(),
    isActive: jest.fn(),
    setValue: jest.fn(),
    resetKey: "",
    isPending: false,
  }),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: () => <div data-testid="build-list-toolbar" />,
}));

const mockUseBuildListKeyboard = jest.fn();

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (...args: unknown[]) => mockUseBuildListKeyboard(...args),
}));

describe("ProjectSettingsViewsPage", () => {
  beforeEach(() => {
    mockCanManage = true;
    mockQuery = { data: makePage([]), isLoading: false, isError: false };
    mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
    mockDeleteMutate.mockReset();
  });

  it("renders the loading state while saved views are loading", () => {
    mockQuery = { data: undefined, isLoading: true, isError: false };

    render(<ProjectSettingsViewsPage projectId={6} />);

    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton")).toHaveLength(2);
  });

  it("renders an actionable empty state for managers", async () => {
    const user = userEvent.setup();

    render(<ProjectSettingsViewsPage projectId={6} />);

    expect(screen.getByRole("heading", { name: "Saved Views" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No saved views yet" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Create view" })[0]);
    expect(screen.getByRole("dialog")).toHaveTextContent("Create saved view");
  });

  it("does not expose create controls to viewers without manage permission", () => {
    mockCanManage = false;

    render(<ProjectSettingsViewsPage projectId={6} />);

    expect(screen.getByRole("heading", { name: "No saved views yet" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create view" })).not.toBeInTheDocument();
  });

  it("renders returned saved views", () => {
    mockQuery = {
      data: makePage([{ id: 1, name: "Engineering board", layoutType: "board", isPinned: true }]),
      isLoading: false,
      isError: false,
    };

    render(<ProjectSettingsViewsPage projectId={6} />);

    expect(screen.getByTestId("view-card")).toHaveTextContent("Engineering board");
  });

  it("shows cursor pagination controls when the server reports hasMore", () => {
    const views = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `View ${i + 1}`,
      layoutType: "list" as const,
      isPinned: false,
    }));
    mockQuery = {
      data: makePage(views, true),
      isLoading: false,
      isError: false,
    };

    render(<ProjectSettingsViewsPage projectId={6} />);

    expect(screen.getAllByTestId("view-card")).toHaveLength(25);
    expect(screen.getByTestId("table-pagination")).toBeInTheDocument();
  });

  it("hides cursor pagination when the only page has no next cursor", () => {
    const views = Array.from({ length: 3 }, (_, i) => ({
      id: i + 1,
      name: `View ${i + 1}`,
      layoutType: "list" as const,
      isPinned: false,
    }));
    mockQuery = {
      data: makePage(views, false),
      isLoading: false,
      isError: false,
    };

    render(<ProjectSettingsViewsPage projectId={6} />);

    expect(screen.getAllByTestId("view-card")).toHaveLength(3);
    expect(screen.queryByTestId("table-pagination")).not.toBeInTheDocument();
  });
});

describe("ProjectSettingsViewsPage — bulk delete (Requirement C3)", () => {
  const viewsList = [
    { id: 1, name: "Sprint view", layoutType: "list" as const, isPinned: false },
    { id: 2, name: "Board view", layoutType: "board" as const, isPinned: true },
  ];

  beforeEach(() => {
    mockCanManage = true;
    mockQuery = { data: makePage(viewsList), isLoading: false, isError: false };
    mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
    mockDeleteMutate.mockReset();
  });

  it("shows a checkbox for each view when canManage is true", () => {
    render(<ProjectSettingsViewsPage projectId={6} />);
    expect(screen.getByLabelText("Select Sprint view")).toBeInTheDocument();
    expect(screen.getByLabelText("Select Board view")).toBeInTheDocument();
  });

  it("does not show checkboxes when the user cannot manage views", () => {
    mockCanManage = false;
    render(<ProjectSettingsViewsPage projectId={6} />);
    expect(screen.queryByLabelText("Select Sprint view")).not.toBeInTheDocument();
  });

  it("shows the bulk delete bar when a view is selected", async () => {
    const user = userEvent.setup();
    render(<ProjectSettingsViewsPage projectId={6} />);

    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Select Sprint view"));

    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete 1 view/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });

  it("hides the bulk delete bar after clearing the selection", async () => {
    const user = userEvent.setup();
    render(<ProjectSettingsViewsPage projectId={6} />);

    await user.click(screen.getByLabelText("Select Sprint view"));
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it("fires delete mutation for every selected view when confirmed", async () => {
    const user = userEvent.setup();
    render(<ProjectSettingsViewsPage projectId={6} />);

    await user.click(screen.getByLabelText("Select Sprint view"));
    await user.click(screen.getByLabelText("Select Board view"));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Delete 2 views/ }));
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(mockDeleteMutate).toHaveBeenCalledWith(
      expect.objectContaining({ viewId: 1, projectId: 6 }),
      expect.anything(),
    );
    expect(mockDeleteMutate).toHaveBeenCalledWith(
      expect.objectContaining({ viewId: 2, projectId: 6 }),
      expect.anything(),
    );
    expect(mockDeleteMutate).toHaveBeenCalledTimes(2);
  });
});

describe("ProjectSettingsViewsPage — keyboard shortcuts (Requirement C3)", () => {
  beforeEach(() => {
    mockCanManage = true;
    mockQuery = { data: makePage([{ id: 1, name: "Sprint view", layoutType: "list", isPinned: false }]), isLoading: false, isError: false };
    mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  });

  it("passes onCreate when canManage so the c key opens the create sheet", () => {
    render(<ProjectSettingsViewsPage projectId={6} />);
    const lastCall = mockUseBuildListKeyboard.mock.calls.at(-1) as [{ onCreate?: () => void }];
    expect(lastCall?.[0]?.onCreate).toBeDefined();
  });

  it("omits onCreate when the user cannot manage views so the c key does not fire", () => {
    mockCanManage = false;
    render(<ProjectSettingsViewsPage projectId={6} />);
    const lastCall = mockUseBuildListKeyboard.mock.calls.at(-1) as [{ onCreate?: () => void }];
    expect(lastCall?.[0]?.onCreate).toBeUndefined();
  });

  it("passes onEdit so the e key opens the rename dialog for the focused view", () => {
    render(<ProjectSettingsViewsPage projectId={6} />);
    const lastCall = mockUseBuildListKeyboard.mock.calls.at(-1) as [{ onEdit?: (i: number) => void }];
    expect(lastCall?.[0]?.onEdit).toBeDefined();
  });

  it("passes searchInputRef to useBuildListKeyboard so the / key focuses the search input", () => {
    render(<ProjectSettingsViewsPage projectId={6} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ searchInputRef: expect.anything() }),
    );
  });
});
