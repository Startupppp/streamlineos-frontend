"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import { SegmentsPage } from "./segments-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/crm/segments",
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

jest.mock("@/components/ui/data-table", () => ({
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: () => <input data-testid="search-input" />,
}));

jest.mock("@/components/renderer", () => ({
  RecordList: () => <div data-testid="record-list" />,
  asRecordValues: (items: unknown[]) => items,
}));

jest.mock("@/components/renderer/use-tenant-layout", () => ({
  useTenantLayout: (layout: unknown) => layout,
}));

jest.mock("@/lib/renderer/crm/segment-layout", () => ({
  SEGMENT_LAYOUT: {
    list: { searchPlaceholder: "Search...", columns: [{ key: "name" }] },
    fields: [],
  },
  segmentRecordFields: (row: unknown) => row,
  withSegmentSources: (layout: unknown) => layout,
}));

jest.mock("@/hooks/api/crm/segments", () => ({
  useSegments: jest.fn(),
  useSegmentSources: jest.fn(() => ({ data: [] })),
  useSegment: jest.fn(() => ({ data: undefined })),
  useDeleteSegment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/lib/list-pagination", () => ({
  STANDARD_PAGE_SIZE_OPTIONS: [10, 25, 50],
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  FILTER_TOOLBAR_ROW: "filter-toolbar-row",
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("./segment-members-sheet", () => ({
  SegmentMembersSheet: () => null,
}));

jest.mock("./segment-sheet", () => ({
  SegmentSheet: () => null,
}));

const mockUseCan = jest.fn<boolean, [string]>(() => false);
jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => mockUseCan(permission),
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

import { useSegments } from "@/hooks/api/crm/segments";
const mockUseSegments = useSegments as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSegments.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseCan.mockReturnValue(false);
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("AP-9: SegmentsPage must resolve through usePageState not a bare useCan gate", () => {
  it("does not show access-denied state while the access snapshot is still loading — useCan returns false during this window so a page gated on it wrongly denies permitted users", () => {
    mockUseCan.mockReturnValue(false);
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<SegmentsPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view when usePageState resolves the permission as denied after the snapshot lands", () => {
    mockUseCan.mockReturnValue(false);
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "crm:segments:view" });

    render(<SegmentsPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders the segments page when usePageState resolves to ready", () => {
    mockUseCan.mockReturnValue(true);
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseSegments.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<SegmentsPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
    expect(screen.getByText("Segments")).toBeInTheDocument();
  });

  it("passes permission crm:segments:view to usePageState so the correct gate is evaluated", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseSegments.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<SegmentsPage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "crm:segments:view" }),
    );
  });
});
