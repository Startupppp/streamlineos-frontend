"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import { ContactListPage } from "./contact-list-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/crm/contacts",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
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

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyPersonIllustration: () => null,
}));

jest.mock("@/components/renderer", () => ({
  RecordList: () => <div data-testid="record-list" />,
  asRecordValues: (items: unknown[]) => items,
}));

jest.mock("@/components/renderer/density-toggle", () => ({
  DensityToggle: () => null,
  useDensity: () => ["comfortable", jest.fn()],
}));

jest.mock("@/components/renderer/use-tenant-layout", () => ({
  useTenantLayout: (layout: unknown) => layout,
}));

jest.mock("@/lib/renderer/crm/contact-layout", () => ({
  CONTACT_LAYOUT: {
    list: { searchPlaceholder: "Search...", columns: [{ key: "name" }] },
  },
}));

jest.mock("@/hooks/api/crm", () => ({
  useContacts: jest.fn(),
  useDeleteContact: () => ({ mutate: jest.fn(), isPending: false }),
  useExportContacts: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/hooks/common/use-query-param-open", () => ({
  useQueryParamOpen: () => ({ open: false, onOpenChange: jest.fn(), setOpen: jest.fn() }),
}));

jest.mock("@/hooks/common/use-cursor-pagination", () => ({
  useCursorPagination: () => ({ page: 1, onNext: jest.fn(), onPrevious: jest.fn() }),
}));

jest.mock("@/lib/download-blob", () => ({ downloadBlob: jest.fn() }));

jest.mock("./consent-gap-notice", () => ({ ConsentGapNotice: () => null }));
jest.mock("./contact-sheet", () => ({ ContactSheet: () => null }));
jest.mock("./contact-delete-dialog", () => ({ ContactDeleteDialog: () => null }));
jest.mock("./contact-merge-selection", () => ({
  ContactSelectionBar: () => null,
  useContactMergeSelection: () => ({
    selectedIds: new Set(),
    toggle: jest.fn(),
    pair: null,
    isOpen: false,
    onOpenChange: jest.fn(),
    clear: jest.fn(),
  }),
}));
jest.mock("@/components/party-merge/party-merge-dialog", () => ({
  PartyMergeDialog: () => null,
}));
jest.mock("./contact-actions-menu", () => ({
  ContactActionsMenu: () => null,
  useEnrichContact: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/features/crm/import/import-link-button", () => ({
  ImportLinkButton: () => null,
}));

jest.mock("@/components/ui/cursor-page-controls", () => ({
  CursorPageControls: () => null,
}));

jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: () => null,
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  CONTENT_FILL_PANEL: "content-fill-panel",
  FILTER_TOOLBAR_ROW: "filter-toolbar-row",
}));

const mockUseCan = jest.fn<boolean, [string]>(() => false);
jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => mockUseCan(permission),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

import { useContacts } from "@/hooks/api/crm";
const mockUseContacts = useContacts as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseContacts.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    access: undefined,
    isFetching: false,
  });
  mockUseCan.mockReturnValue(false);
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("AP-9: ContactListPage must resolve through usePageState not a bare useCanState gate", () => {
  it("does not show access-denied state while the access snapshot is still loading — useCanState returns denied during this window so a page gated on it wrongly denies permitted users", () => {
    mockUseCan.mockReturnValue(false);
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<ContactListPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view when usePageState resolves the permission as denied after the snapshot lands", () => {
    mockUseCan.mockReturnValue(false);
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "crm:contacts:view" });

    render(<ContactListPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders the contacts page when usePageState resolves to ready", () => {
    mockUseCan.mockReturnValue(true);
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseContacts.mockReturnValue({
      data: { items: [], total: 0, hasMore: false },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
      access: undefined,
      isFetching: false,
    });

    render(<ContactListPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("passes permission crm:contacts:view to usePageState so the correct gate is evaluated", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseContacts.mockReturnValue({
      data: { items: [], total: 0, hasMore: false },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
      access: undefined,
      isFetching: false,
    });

    render(<ContactListPage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "crm:contacts:view" }),
    );
  });
});
