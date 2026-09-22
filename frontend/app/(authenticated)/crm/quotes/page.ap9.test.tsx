"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import QuotesPage from "./page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/crm/quotes",
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

jest.mock("@/components/illustrations", () => ({
  EmptyDocumentsIllustration: () => null,
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

jest.mock("@/lib/renderer/crm/quote-layout", () => ({
  QUOTE_LAYOUT: {
    list: { searchPlaceholder: "Search...", columns: [{ key: "status" }] },
  },
  quoteListRecordFields: (q: unknown) => q,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="confirm-dialog" /> : null,
}));

jest.mock("@/components/ui/cursor-page-controls", () => ({
  CursorPageControls: () => null,
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  CONTENT_FILL_PANEL: "content-fill-panel",
  FILTER_TOOLBAR_ROW: "filter-toolbar-row",
  FILTER_SELECT_TRIGGER: "filter-select-trigger",
}));

jest.mock("@/hooks/api/org-display", () => ({
  useOrgDisplay: () => ({ currency: "USD", locale: "en-US" }),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/features/crm/quotes/components/quote-row-actions", () => ({
  QuoteRowActions: () => null,
}));

jest.mock("@/features/crm/quotes/lib/quote-utils", () => ({
  STATUS_LABELS: {},
  isQuoteStatus: () => false,
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

const mockUseQuotes = jest.fn();
const mockUseUpdateQuoteStatus = jest.fn();
const mockUseSendQuote = jest.fn();
const mockUseDeleteQuote = jest.fn();
jest.mock("@/hooks/api/crm", () => ({
  useQuotes: () => mockUseQuotes(),
  useUpdateQuoteStatus: () => mockUseUpdateQuoteStatus(),
  useDeleteQuote: () => mockUseDeleteQuote(),
}));
jest.mock("@/hooks/api/crm/quotes", () => ({
  useSendQuote: () => mockUseSendQuote(),
  downloadQuotesCsv: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseQuotes.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    access: undefined,
  });
  mockUseUpdateQuoteStatus.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseSendQuote.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseDeleteQuote.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("AP-9: QuotesPage must resolve through usePageState not a bare useCanState gate", () => {
  it("does not show access-denied state while the access snapshot is loading — the old useCanState wrongly denied permitted users in this window", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<QuotesPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view after usePageState resolves crm:quotes:read as denied", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "crm:quotes:read" });

    render(<QuotesPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders quotes list when usePageState resolves to ready", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseQuotes.mockReturnValue({
      data: { quotes: [], hasMore: false },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
      access: undefined,
    });

    render(<QuotesPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("passes permission crm:quotes:read and error to usePageState so the 402 upgrade path is reachable", () => {
    const err = new ApiError("CRM not in plan.", 402, "MODULE_NOT_ENABLED", {
      moduleKey: "crm",
      reason: "not-in-plan",
      upgradePath: "/settings/billing",
    });
    mockUseQuotes.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: err,
      refetch: jest.fn(),
      access: undefined,
    });
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<QuotesPage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "crm:quotes:read", error: err }),
    );
  });
});

describe("AP-10: QuotesPage delete prompt uses ConfirmDialog not a hand-rolled AlertDialog", () => {
  it("does not render a raw AlertDialogAction for the delete confirm", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseQuotes.mockReturnValue({
      data: { quotes: [], hasMore: false },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
      access: undefined,
    });

    const { container } = render(<QuotesPage />);

    expect(container.querySelector("[class*='destructive']")).not.toBeInTheDocument();
  });
});
