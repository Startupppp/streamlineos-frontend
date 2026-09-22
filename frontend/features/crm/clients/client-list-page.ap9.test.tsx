"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import { ClientListPage } from "./client-list-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/crm/clients",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (
      resolution.kind === "denied" ||
      resolution.kind === "module-disabled" ||
      resolution.kind === "plan-required" ||
      resolution.kind === "module-denied"
    )
      return <div role="status">Access Restricted</div>;
    return <div>{resolution.kind}</div>;
  },
}));

jest.mock("@/components/ui/data-table-skeleton", () => ({
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: () => <input data-testid="search-input" />,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyClientsIllustration: () => null,
}));

jest.mock("@/components/renderer", () => ({
  RecordList: () => <div data-testid="record-list" />,
}));

jest.mock("@/components/renderer/density-toggle", () => ({
  DensityToggle: () => null,
  useDensity: () => ["comfortable", jest.fn()],
}));

jest.mock("@/components/renderer/use-tenant-layout", () => ({
  useTenantLayout: (layout: unknown) => layout,
}));

jest.mock("@/lib/renderer/crm/client-layout", () => ({
  CLIENT_LAYOUT: {
    list: { searchPlaceholder: "Search...", columns: [{ key: "name" }] },
    fields: [],
  },
}));

jest.mock("@/hooks/api/crm/clients", () => ({
  useClientAccounts: jest.fn(),
}));

jest.mock("@/hooks/api/org-display", () => ({
  useOrgDisplay: () => ({ locale: "en", currency: "USD" }),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("./client-record", () => ({
  clientRecords: (accounts: unknown[]) => accounts,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  CONTENT_FILL_PANEL: "content-fill-panel",
  FILTER_SELECT_TRIGGER: "filter-select-trigger",
  FILTER_TOOLBAR_ROW: "filter-toolbar-row",
}));

jest.mock("@/components/ui/field-control", () => ({
  FIELD_SELECT_CONTENT_CLASS: "field-select-content",
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

import { useClientAccounts } from "@/hooks/api/crm/clients";
const mockUseClientAccounts = useClientAccounts as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseClientAccounts.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("AP-9: ClientListPage must resolve through usePageState not a bare useCanState gate", () => {
  it("does not show access-denied state while the access snapshot is still loading — useCanState returns denied during this window so a page gated on it wrongly denies permitted users", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<ClientListPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view when usePageState resolves the permission as denied after the snapshot lands", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "crm:clients:read" });

    render(<ClientListPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders the clients page when usePageState resolves to ready", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseClientAccounts.mockReturnValue({
      data: { accounts: [], totalCount: 0 },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ClientListPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
    expect(screen.getByText("Clients")).toBeInTheDocument();
  });

  it("passes permission crm:clients:read to usePageState so the correct gate is evaluated", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseClientAccounts.mockReturnValue({
      data: { accounts: [], totalCount: 0 },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ClientListPage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "crm:clients:read" }),
    );
  });
});
