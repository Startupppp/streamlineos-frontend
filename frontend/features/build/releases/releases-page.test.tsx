import { render, screen } from "@testing-library/react";
import { ReleasesPage } from "./releases-page";

let mockIsOnline = true;
const mockPreventDefault = jest.fn();
let mockDataTableProps: Record<string, unknown> = {};
jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockIsOnline,
}));

jest.mock("@/hooks/api/build/releases", () => ({
  useReleases: jest.fn(),
  useDeleteRelease: jest.fn(),
  useUpdateRelease: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/features/build/shared/build-header-actions", () => ({
  BuildHeaderActions: ({ actions }: { actions: Array<{ id: string; label: string; onSelect?: () => void }> }) => (
    <div>
      {actions.map((action) => (
        <button key={action.id} type="button" onClick={action.onSelect}>{action.label}</button>
      ))}
    </div>
  ),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, actions }: { children: React.ReactNode; title?: string; actions?: React.ReactNode }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {actions ? <div data-testid="page-actions">{actions}</div> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({
    isLoading,
    emptyState,
    data,
    selection,
    onRowContextMenu,
    ...rest
  }: {
    isLoading?: boolean;
    emptyState?: React.ReactNode;
    data?: { id: number; name: string }[];
    selection?: { onChange: (s: Set<number>) => void };
    onRowContextMenu?: (row: { id: number; name: string }, event: { preventDefault: () => void; clientX: number; clientY: number }) => void;
  }) => {
    mockDataTableProps = { selection, onRowContextMenu, ...rest };
    if (isLoading) return <div data-testid="table-loading" />;
    if (data?.length === 0) return <>{emptyState}</>;
    const handleSelect = () => selection?.onChange(new Set([1]));
    return (
      <div data-testid="table-rows" onClick={handleSelect}>
        {(data ?? []).map((row) => {
          const handleContextMenu = () =>
            onRowContextMenu?.(row, { preventDefault: mockPreventDefault, clientX: 120, clientY: 240 });
          return (
            <button
              key={row.id}
              type="button"
              data-testid={`row-contextmenu-${row.id}`}
              onClick={handleContextMenu}
            />
          );
        })}
      </div>
    );
  },
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: ({ label, value }: { label: string; value: number }) => (
    <div data-testid={`stat-${label.toLowerCase()}`}>{value}</div>
  ),
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CONTENT_FILL_PANEL: "pm-fill-panel",
  PM_TOOLBAR: "",
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (value: string) => void }) => (
    <div>
      {children}
      <button type="button" data-testid="select-released" onClick={() => onValueChange?.("released")}>
        released
      </button>
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ open, description }: { open: boolean; description?: string }) =>
    open ? <div data-testid="confirm-delete">{description}</div> : null,
}));

jest.mock("./releases-page-parts", () => ({
  STATUS_CONFIG: {
    draft: { label: "Draft", className: "" },
    released: { label: "Released", className: "" },
    archived: { label: "Archived", className: "" },
  },
}));

jest.mock("./release-form-sheet", () => ({
  ReleaseFormSheet: () => <div data-testid="release-form-sheet" />,
}));

import { fireEvent } from "@testing-library/react";
import { ReleaseMobileCard, buildReleasesColumns } from "./releases-table-columns";
import type { Release } from "@/hooks/api/build/releases";

function releaseColumnCell(
  key: string,
  handlers: { canManage: boolean; onEdit: (r: Release) => void; onDelete: (r: Release) => void },
) {
  const column = buildReleasesColumns(handlers).find((c) => c.key === key);
  const cell = column?.cell;
  if (cell === undefined) throw new Error(`the releases table has no ${key} column with a cell`);
  return cell;
}
import { useReleases, useDeleteRelease } from "@/hooks/api/build/releases";
import { useCan, useAccess } from "@/hooks/api/access";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/build",
  useSearchParams: () => mockSearchParams,
}));

beforeEach(() => {
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams();
});


const mockUseReleases = useReleases as jest.Mock;
const mockUseDeleteRelease = useDeleteRelease as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function baseQueryResult(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

function cursorPage<T>(items: T[]) {
  return { data: items, pagination: { limit: 25, hasMore: false, nextCursor: null } };
}

beforeEach(() => {
  mockIsOnline = true;
  mockPreventDefault.mockClear();
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseReleases.mockReturnValue(baseQueryResult({ data: cursorPage([]) }));
  mockUseDeleteRelease.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockDataTableProps = {};
});

it("renders NoPermissionState when build:view is denied instead of empty releases table", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseReleases.mockReturnValue(baseQueryResult());
  render(<ReleasesPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("shows actual query error message on failure instead of hardcoded text", () => {
  mockUseReleases.mockReturnValue(
    baseQueryResult({ isError: true, error: new Error("Build module is not enabled for this project") }),
  );
  render(<ReleasesPage projectId={1} />);
  const errorEl = screen.getByTestId("error-state");
  expect(errorEl.textContent).toContain("Build module is not enabled");
});

it("hides New Release button when build:manage is denied", () => {
  mockUseCan.mockReturnValue(false);
  render(<ReleasesPage projectId={1} />);
  expect(screen.queryByRole("button", { name: /new release/i })).not.toBeInTheDocument();
});

it("shows New Release button when build:manage is granted", () => {
  mockUseCan.mockReturnValue(true);
  render(<ReleasesPage projectId={1} />);
  expect(screen.getByRole("button", { name: /new release/i })).toBeInTheDocument();
});

it("keyboard c shortcut opens the release form sheet", () => {
  mockUseCan.mockReturnValue(true);
  render(<ReleasesPage projectId={1} />);
  fireEvent.keyDown(document, { key: "c" });
  expect(screen.getByTestId("release-form-sheet")).toBeInTheDocument();
});

const releaseRow = {
  id: 1,
  orgId: "org-1",
  projectId: 1,
  name: "v1.0.0",
  version: "1.0.0",
  rowVersion: 4,
  status: "draft" as const,
  releaseDate: null,
  publishedAt: null,
  ticketCount: 0,
  description: null,
  createdBy: null,
  createdByUser: null,
  deletedAt: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

const OWNER_USER_ID = "user-7";
const OWNER = {
  name: "Ada Lovelace",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.test",
};

it("shows the offline notice when the user loses connectivity", () => {
  mockIsOnline = false;
  render(<ReleasesPage projectId={1} />);
  expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
});

it("hides the offline notice when the user is online", () => {
  mockIsOnline = true;
  render(<ReleasesPage projectId={1} />);
  expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
});

it("rejects a release row that omits the createdBy key so a future dropped projection cannot decode silently", async () => {
  const { projectReleaseListContract } = await import("@/hooks/api/build/build-project-schema");
  const rowWithoutCreatedBy = {
    id: 1,
    projectId: 1,
    name: "v1",
    version: "1.0.0",
    rowVersion: 1,
    description: null,
    status: "draft",
    releaseDate: null,
    publishedAt: null,
    ticketCount: 0,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };
  const result = projectReleaseListContract.safeParse({
    data: [rowWithoutCreatedBy],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  });
  expect(result.success).toBe(false);
});

it("accepts a release row where createdBy is null since the column may be unset", async () => {
  const { projectReleaseListContract } = await import("@/hooks/api/build/build-project-schema");
  const rowWithNullCreatedBy = {
    id: 1,
    projectId: 1,
    name: "v1",
    version: "1.0.0",
    rowVersion: 1,
    description: null,
    status: "draft",
    releaseDate: null,
    publishedAt: null,
    ticketCount: 0,
    createdBy: null,
    createdByUser: null,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };
  const result = projectReleaseListContract.safeParse({
    data: [rowWithNullCreatedBy],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  });
  expect(result.success).toBe(true);
});

it("renders the plain-text notes below the version in the name column cell", () => {
  const nameCell = releaseColumnCell("name", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(nameCell({ ...releaseRow, description: "<p>Bug fixes and performance</p>" }));
  expect(screen.getByText("Bug fixes and performance")).toBeInTheDocument();
});

it("omits the notes text from the name cell when description is null so the cell stays compact", () => {
  const nameCell = releaseColumnCell("name", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(nameCell({ ...releaseRow, description: null }));
  expect(screen.queryByText("Bug fixes and performance")).not.toBeInTheDocument();
});

it("renders the owner display name in the createdBy column cell and never the raw user id (FE-85)", () => {
  const createdByCell = releaseColumnCell("createdBy", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(createdByCell({ ...releaseRow, createdBy: OWNER_USER_ID, createdByUser: OWNER }));
  expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  expect(screen.queryByText(OWNER_USER_ID)).not.toBeInTheDocument();
});

it("renders the email local part in the createdBy cell for an owner with no name, still never the raw user id", () => {
  const createdByCell = releaseColumnCell("createdBy", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(
    createdByCell({
      ...releaseRow,
      createdBy: OWNER_USER_ID,
      createdByUser: { name: null, firstName: null, lastName: null, email: "ada@example.test" },
    }),
  );
  expect(screen.getByText("ada")).toBeInTheDocument();
  expect(screen.queryByText(OWNER_USER_ID)).not.toBeInTheDocument();
});

it("renders a dash in the createdBy cell when createdByUser is null, so an unresolvable owner is an absent value and not a blank loading cell", () => {
  const createdByCell = releaseColumnCell("createdBy", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(createdByCell({ ...releaseRow, createdBy: null, createdByUser: null }));
  expect(screen.getByText("—")).toBeInTheDocument();
});

it("renders a dash and not the id when createdBy still holds an id whose user row is gone", () => {
  const createdByCell = releaseColumnCell("createdBy", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(createdByCell({ ...releaseRow, createdBy: OWNER_USER_ID, createdByUser: null }));
  expect(screen.getByText("—")).toBeInTheDocument();
  expect(screen.queryByText(OWNER_USER_ID)).not.toBeInTheDocument();
});

it("renders the release description as notes text in the mobile card", () => {
  render(
    <ReleaseMobileCard
      release={{ ...releaseRow, description: "<p>Bug fixes and performance improvements</p>", createdBy: null }}
      canManage={false}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
    />,
  );
  expect(screen.getByText("Bug fixes and performance improvements")).toBeInTheDocument();
});

it("renders the owner display name in the mobile card and never the raw user id (FE-85)", () => {
  render(
    <ReleaseMobileCard
      release={{ ...releaseRow, description: null, createdBy: OWNER_USER_ID, createdByUser: OWNER }}
      canManage={false}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
    />,
  );
  expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  expect(screen.queryByText(OWNER_USER_ID)).not.toBeInTheDocument();
});

it("omits the created-by row from the mobile card when createdByUser is null, rather than falling back to the id", () => {
  render(
    <ReleaseMobileCard
      release={{ ...releaseRow, description: null, createdBy: OWNER_USER_ID, createdByUser: null }}
      canManage={false}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
    />,
  );
  expect(screen.queryByText("Created by")).not.toBeInTheDocument();
  expect(screen.queryByText(OWNER_USER_ID)).not.toBeInTheDocument();
});

it("rejects a release row that omits publishedAt because a dropped projection must not decode silently", async () => {
  const { projectReleaseListContract } = await import("@/hooks/api/build/build-project-schema");
  const rowWithoutPublishedAt = {
    id: 1,
    projectId: 1,
    name: "v1",
    version: "1.0.0",
    rowVersion: 1,
    description: null,
    status: "draft",
    releaseDate: null,
    ticketCount: 0,
    createdBy: null,
    createdByUser: null,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };
  const result = projectReleaseListContract.safeParse({
    data: [rowWithoutPublishedAt],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  });
  expect(result.success).toBe(false);
});

it("rejects a release row that omits createdByUser, so a dropped join cannot decode into a permanent dash", async () => {
  const { projectReleaseListContract } = await import("@/hooks/api/build/build-project-schema");
  const rowWithoutCreatedByUser = {
    id: 1,
    projectId: 1,
    name: "v1",
    version: "1.0.0",
    rowVersion: 1,
    description: null,
    status: "draft",
    releaseDate: null,
    publishedAt: null,
    ticketCount: 0,
    createdBy: OWNER_USER_ID,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };
  const result = projectReleaseListContract.safeParse({
    data: [rowWithoutCreatedByUser],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  });
  expect(result.success).toBe(false);
});

it("accepts a release row whose createdByUser is the four-field user object the join projects", async () => {
  const { projectReleaseListContract } = await import("@/hooks/api/build/build-project-schema");
  const result = projectReleaseListContract.safeParse({
    data: [
      {
        id: 1,
        projectId: 1,
        name: "v1",
        version: "1.0.0",
        rowVersion: 1,
        description: null,
        status: "draft",
        releaseDate: null,
        publishedAt: null,
        ticketCount: 0,
        createdBy: OWNER_USER_ID,
        createdByUser: OWNER,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
    ],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  });
  expect(result.success).toBe(true);
});

it("renders a dash in the published column for a draft release that has never been released", () => {
  const publishedCell = releaseColumnCell("publishedAt", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(publishedCell({ ...releaseRow, status: "draft", publishedAt: null }));
  expect(screen.getByText("—")).toBeInTheDocument();
});

it("renders a formatted date in the published column for a released row that has a known publication date", () => {
  const publishedCell = releaseColumnCell("publishedAt", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(publishedCell({ ...releaseRow, status: "released", publishedAt: "2026-09-01T10:00:00Z" }));
  expect(screen.getByText("Sep 1, 2026")).toBeInTheDocument();
});

it("renders Unknown in the published column for a released row with null publishedAt because the release predates the migration", () => {
  const publishedCell = releaseColumnCell("publishedAt", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(publishedCell({ ...releaseRow, status: "released", publishedAt: null }));
  expect(screen.getByText("Unknown")).toBeInTheDocument();
});

describe("right click on a release row opens the row's authorized actions", () => {
  function renderWithRows() {
    mockUseReleases.mockReturnValue(baseQueryResult({ data: cursorPage([releaseRow]) }));
    render(<ReleasesPage projectId={1} />);
  }

  it("opens Edit and Delete for a viewer who can manage releases, and suppresses the browser menu", () => {
    renderWithRows();
    expect(screen.queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("row-contextmenu-1"));
    expect(mockPreventDefault).toHaveBeenCalled();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });

  it("opens nothing and leaves the browser menu alone for a viewer who cannot manage releases", () => {
    mockUseCan.mockReturnValue(false);
    renderWithRows();
    fireEvent.click(screen.getByTestId("row-contextmenu-1"));
    expect(mockPreventDefault).not.toHaveBeenCalled();
    expect(screen.queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("opens the edit sheet for the row the menu was opened on", () => {
    renderWithRows();
    fireEvent.click(screen.getByTestId("row-contextmenu-1"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(screen.getByTestId("release-form-sheet")).toBeInTheDocument();
  });

  it("opens the destructive confirmation naming the row, rather than deleting it outright", () => {
    renderWithRows();
    fireEvent.click(screen.getByTestId("row-contextmenu-1"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(screen.getByTestId("confirm-delete")).toHaveTextContent("v1.0.0");
  });
});

describe("a release is never selected as a row, because it is this page's primary record", () => {
  it("passes no selection to the table, so no checkbox column and no bulk status strip exist", () => {
    mockUseReleases.mockReturnValue(baseQueryResult({ data: cursorPage([releaseRow]) }));
    render(<ReleasesPage projectId={1} />);
    expect(mockDataTableProps.selection).toBeUndefined();
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Set status…")).not.toBeInTheDocument();
  });

  it("still reaches one release's status through its own edit sheet, so removing the strip removed no capability", () => {
    mockUseReleases.mockReturnValue(baseQueryResult({ data: cursorPage([releaseRow]) }));
    render(<ReleasesPage projectId={1} />);
    expect(screen.queryByTestId("release-form-sheet")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("row-contextmenu-1"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(screen.getByTestId("release-form-sheet")).toBeInTheDocument();
  });
});
