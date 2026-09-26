import { render, screen } from "@testing-library/react";
import { ReleasesPage } from "./releases-page";

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
  }: {
    isLoading?: boolean;
    emptyState?: React.ReactNode;
    data?: unknown[];
    selection?: { onChange: (s: Set<number>) => void };
  }) =>
    isLoading ? <div data-testid="table-loading" /> : data?.length === 0 ? <>{emptyState}</> : <div data-testid="table-rows" onClick={() => selection?.onChange(new Set([1]))} />,
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
  PM_FILL_PANEL: "pm-fill-panel",
  PM_TOOLBAR: "",
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  ConfirmDialog: () => null,
}));

jest.mock("./releases-page-parts", () => ({
  STATUS_CONFIG: {
    draft: { label: "Draft", className: "" },
    released: { label: "Released", className: "" },
    archived: { label: "Archived", className: "" },
  },
  NewReleaseButton: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} data-testid="new-release-btn">New Release</button>
  ),
  DeleteReleaseButton: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} data-testid="delete-release-btn">Delete</button>
  ),
}));

jest.mock("./release-form-sheet", () => ({
  ReleaseFormSheet: () => <div data-testid="release-form-sheet" />,
}));

import { fireEvent } from "@testing-library/react";
import { useReleases, useDeleteRelease, useUpdateRelease } from "@/hooks/api/build/releases";
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
const mockUseUpdateRelease = useUpdateRelease as jest.Mock;
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
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseReleases.mockReturnValue(baseQueryResult({ data: cursorPage([]) }));
  mockUseDeleteRelease.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateRelease.mockReturnValue({ mutate: jest.fn(), isPending: false });
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
  status: "draft" as const,
  releaseDate: null,
  ticketCount: 0,
  description: null,
  createdBy: null,
  deletedAt: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

it("shows bulk action bar with count after row is selected", () => {
  mockUseReleases.mockReturnValue(baseQueryResult({ data: cursorPage([releaseRow]) }));
  render(<ReleasesPage projectId={1} />);
  expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByTestId("table-rows"));
  expect(screen.getByText("1 selected")).toBeInTheDocument();
});

it("hides bulk action bar after clear button is clicked", () => {
  mockUseReleases.mockReturnValue(baseQueryResult({ data: cursorPage([releaseRow]) }));
  render(<ReleasesPage projectId={1} />);
  fireEvent.click(screen.getByTestId("table-rows"));
  fireEvent.click(screen.getByLabelText("Clear selection"));
  expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
});
