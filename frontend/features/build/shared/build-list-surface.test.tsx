import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { BuildListSurface } from "./build-list-surface";
import type { DataTableColumn } from "@/components/ui/data-table";

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(),
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({ data, className }: { data: unknown[]; className?: string }) => (
    <div data-testid="data-table" data-rows={data.length} className={className} />
  ),
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build",
  useSearchParams: () => new URLSearchParams(),
}));

import { useAccess } from "@/hooks/api/access";
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_LOADING = { data: undefined, isLoading: true };
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

interface TestRow {
  id: number;
  name: string;
}

const COLUMNS: DataTableColumn<TestRow>[] = [
  { key: "name", header: "Name", cell: (row) => row.name },
];

function getRowKey(row: TestRow) {
  return row.id;
}

const EMPTY_TEXT = "Nothing here yet";
const FILTERED_EMPTY_TEXT = "No results match your search";

function surface(overrides: {
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  rows?: TestRow[];
  isFiltered?: boolean;
}) {
  const {
    isLoading = false,
    isError = false,
    error,
    rows = [],
    isFiltered = false,
  } = overrides;
  return (
    <BuildListSurface<TestRow>
      permission="build:view"
      rows={rows}
      columns={COLUMNS}
      isLoading={isLoading}
      isError={isError}
      error={error}
      isFiltered={isFiltered}
      getRowKey={getRowKey}
      empty={<div>{EMPTY_TEXT}</div>}
      filteredEmpty={<div>{FILTERED_EMPTY_TEXT}</div>}
      onRetry={jest.fn()}
    />
  );
}

beforeEach(() => {
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
});

describe("BuildListSurface — branch order: denied before loading", () => {
  it("shows denied state when access is denied even while data is loading", () => {
    mockUseAccess.mockReturnValue(ACCESS_DENIED);
    render(surface({ isLoading: true }));
    expect(screen.queryByTestId("data-table-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
  });

  it("shows loading skeleton when access is granted and data is loading", () => {
    render(surface({ isLoading: true }));
    expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
  });
});

describe("BuildListSurface — branch order: access loading before denied", () => {
  it("shows loading state when access is still loading so denied cannot flash early", () => {
    mockUseAccess.mockReturnValue(ACCESS_LOADING);
    render(surface({ isLoading: false }));
    expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
  });

  it("shows empty state once access loads as granted and rows are empty", () => {
    render(surface({ isLoading: false, rows: [] }));
    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(screen.queryByTestId("data-table-skeleton")).not.toBeInTheDocument();
  });
});

describe("BuildListSurface — branch order: loading before error", () => {
  it("shows loading skeleton when isLoading is true even if isError would also be set", () => {
    render(surface({ isLoading: true, isError: false }));
    expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("shows error state when isLoading is false and isError is true", () => {
    render(surface({ isLoading: false, isError: true, error: new Error("fetch failed") }));
    expect(screen.queryByTestId("data-table-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
  });
});

describe("BuildListSurface — branch order: error before empty", () => {
  it("shows error state when isError is true and rows are empty, not empty state", () => {
    render(surface({ isError: true, error: new Error("Network error"), rows: [] }));
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
  });

  it("shows empty state when isError is false and rows are empty", () => {
    render(surface({ isError: false, rows: [], isFiltered: false }));
    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
  });
});

describe("BuildListSurface — 402 surfaces as upgrade path, not error toast (FE-41)", () => {
  it("does not show a generic error when the 402 carries MODULE_NOT_ENABLED", () => {
    const upgradeError = new ApiError(
      "Module not enabled",
      402,
      "MODULE_NOT_ENABLED",
      { moduleKey: "build", reason: "not-in-plan", upgradePath: "/settings/billing" },
    );
    render(surface({ isError: true, error: upgradeError }));
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
  });

  it("shows the data table when the same permission is granted without an error", () => {
    render(surface({ isError: false, rows: [{ id: 1, name: "Row" }] }));
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });
});

describe("BuildListSurface — empty state: no results vs nothing exists", () => {
  it("shows the empty node when rows are empty and no filters are active", () => {
    render(surface({ rows: [], isFiltered: false }));
    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(FILTERED_EMPTY_TEXT)).not.toBeInTheDocument();
  });

  it("shows filteredEmpty node when rows are empty and filters are active", () => {
    render(surface({ rows: [], isFiltered: true }));
    expect(screen.getByText(FILTERED_EMPTY_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
  });

  it("shows the data table when rows are present regardless of filter state", () => {
    render(surface({ rows: [{ id: 1, name: "Alpha" }], isFiltered: true }));
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.queryByText(FILTERED_EMPTY_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
  });
});

describe("BuildListSurface — rows render in ready state", () => {
  it("renders the data table when rows are present and access is granted", () => {
    render(surface({ rows: [{ id: 1, name: "Alpha" }, { id: 2, name: "Beta" }] }));
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.getByTestId("data-table")).toHaveAttribute("data-rows", "2");
  });

  it("preserves the fill-height flex chain that lets the shared table footer reach the page bottom", () => {
    render(surface({ rows: [{ id: 1, name: "Alpha" }] }));

    const table = screen.getByTestId("data-table");
    expect(table).toHaveClass("flex", "min-h-0", "flex-1", "flex-col");
    expect(table.parentElement).toHaveClass("flex", "min-h-0", "flex-1", "flex-col");
    expect(table.parentElement?.parentElement).toHaveClass(
      "flex",
      "min-h-0",
      "flex-1",
      "flex-col",
    );
  });

  it("does not render the data table when access is denied even with rows provided", () => {
    mockUseAccess.mockReturnValue(ACCESS_DENIED);
    render(surface({ rows: [{ id: 1, name: "Alpha" }] }));
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
  });
});

describe("BuildListSurface — a 404 is not an empty list", () => {
  it("renders the not-found state, not the empty node, when the read 404s because the project is gone or unreachable", () => {
    render(surface({ isError: true, error: new ApiError("Project not found", 404, "NOT_FOUND") }));
    expect(screen.getByRole("heading", { name: "Not found" })).toBeInTheDocument();
    expect(screen.getByText("This doesn't exist, or you don't have access to it.")).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
  });

  it("renders Access Restricted, not not-found, when the read is refused with a 403", () => {
    render(surface({ isError: true, error: new ApiError("Not a project member", 403, "FORBIDDEN") }));
    expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Not found" })).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
  });

  it("still renders the empty node for a successful read that returned no rows", () => {
    render(surface({ rows: [] }));
    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Not found" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Access Restricted" })).not.toBeInTheDocument();
  });
});
