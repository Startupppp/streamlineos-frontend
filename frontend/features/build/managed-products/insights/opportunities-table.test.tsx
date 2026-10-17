import { render, screen } from "@testing-library/react";
import { OpportunitiesTable } from "./opportunities-table";

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({
    data: { isOrgOwner: false, scopes: { "build:managed-products:view": "all" }, modules: {} },
    isLoading: false,
  })),
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table" data-rows={data.length} />
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

const BASE_PAGINATION = {
  limit: 20,
  hasMore: false,
  nextCursor: null,
};

const BASE_PROPS = {
  managedProductId: 1,
  rows: [] as never[],
  pagination: BASE_PAGINATION,
  isLoading: false,
  isError: false,
  isFiltered: false,
  onNext: jest.fn(),
  onPrevious: jest.fn(),
  hasPrevious: false,
  pageNumber: 1,
  onRowClick: jest.fn(),
  selected: new Set<number>() as ReadonlySet<number>,
  onToggleSelect: jest.fn(),
  onOpenCompare: jest.fn(),
};

describe("OpportunitiesTable — empty vs filteredEmpty (BSN-FILTERED-EMPTY)", () => {
  it("shows the generic empty state when no filter is active and the list is empty", () => {
    render(<OpportunitiesTable {...BASE_PROPS} isFiltered={false} />);

    expect(screen.getByTestId("opportunities-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("opportunities-filtered-empty")).not.toBeInTheDocument();
  });

  it("shows the filtered empty state instead of the generic empty state when a filter is active and the list is empty so the user knows results exist but are hidden", () => {
    render(<OpportunitiesTable {...BASE_PROPS} isFiltered />);

    expect(screen.getByTestId("opportunities-filtered-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("opportunities-empty")).not.toBeInTheDocument();
  });
});
