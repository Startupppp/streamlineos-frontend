import { render } from "@testing-library/react";
import { ReleasesPage } from "./releases-page";

export const releaseState: {
  isOnline: boolean;
  dataTableProps: Record<string, unknown>;
} = { isOnline: true, dataTableProps: {} };

export const mockPreventDefault = jest.fn();
jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => releaseState.isOnline,
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
    releaseState.dataTableProps = { selection, onRowContextMenu, ...rest };
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

import { ReleaseMobileCard, buildReleasesColumns } from "./releases-table-columns";
import type { Release } from "@/hooks/api/build/releases";

export { ReleaseMobileCard, buildReleasesColumns };

export function releaseColumnCell(
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

export const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/build",
  useSearchParams: () => mockSearchParams,
}));

export function installReleasesNavigationMocks() {
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams();
}


export const mockUseReleases = useReleases as jest.Mock;
export const mockUseDeleteRelease = useDeleteRelease as jest.Mock;
export const mockUseCan = useCan as jest.Mock;
export const mockUseAccess = useAccess as jest.Mock;

export const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
  isLoading: false,
};
export const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

export function baseQueryResult(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

export function cursorPage<T>(items: T[]) {
  return { data: items, pagination: { limit: 25, hasMore: false, nextCursor: null } };
}

export function installReleasesMocks() {
  installReleasesNavigationMocks();
  releaseState.isOnline = true;
  mockPreventDefault.mockClear();
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseReleases.mockReturnValue(baseQueryResult({ data: cursorPage([]) }));
  mockUseDeleteRelease.mockReturnValue({ mutate: jest.fn(), isPending: false });
  releaseState.dataTableProps = {};
}

export const releaseRow = {
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

export const OWNER_USER_ID = "user-7";
export const OWNER = {
  name: "Ada Lovelace",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.test",
};
