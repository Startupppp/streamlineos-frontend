"use client";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseStockLevels = jest.fn();
const mockUseWarehouses = jest.fn();
const mockUseLocations = jest.fn();

const accessLoading = { data: undefined, isLoading: true };

const accessGranted = {
  data: {
    isOrgOwner: false,
    scopes: { "inventory:stock:read": "all", "inventory:stock:adjust": "all" },
    modules: {},
  },
  isLoading: false,
};

const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function emptyQuery() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: () => false,
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/inventory/stock", () => ({
  useStockLevels: () => mockUseStockLevels(),
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  useWarehouses: () => mockUseWarehouses(),
  useLocations: () => mockUseLocations(),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children?: ReactNode; title?: string }) => (
    <div>
      {title && <h1>{title}</h1>}
      {children}
    </div>
  ),
}));

jest.mock("@/features/inventory/components/stock/stock-levels-table", () => ({
  StockLevelsTable: () => <div data-testid="stock-levels-table" />,
  getStockStatus: () => "ok",
  STOCK_STATUS_ORDER: { ok: 0 },
}));

jest.mock("@/features/inventory/components/stock/availability-popover", () => ({
  AvailabilityPopover: () => null,
}));

jest.mock("@/features/inventory/components/stock/reservations-panel", () => ({
  ReservationsPanel: () => <div data-testid="reservations-panel" />,
}));

jest.mock("@/features/inventory/components/stock/opening-stock-sheet", () => ({
  OpeningStockSheet: () => null,
}));

jest.mock("@/features/inventory/components/inventory-empty-state", () => ({
  InventoryEmptyState: ({ title }: { title?: string }) => (
    <div data-testid="inventory-empty-state">{title ?? "Empty"}</div>
  ),
}));

jest.mock("@/components/ui/data-table-skeleton", () => ({
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: () => <input aria-label="search" />,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode; value: string }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
}));

jest.mock("@/lib/motion-variants", () => ({
  useMotionVariants: () => ({ staggerContainer: {}, fadeUp: {} }),
}));

jest.mock("@/components/illustrations", () => ({
  EmptyWarehouseIllustration: () => null,
  EmptySearchIllustration: () => null,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ title }: { title?: string }) => (
    <div data-testid="error-state">{title ?? "Error"}</div>
  ),
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  FILTER_SELECT_TRIGGER: "",
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

import StockLevelsPage from "./page";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(accessGranted);
  mockUseStockLevels.mockReturnValue(emptyQuery());
  mockUseWarehouses.mockReturnValue({ data: undefined });
  mockUseLocations.mockReturnValue({ data: [] });
});

describe("StockLevelsPage — access is three-valued, not a boolean", () => {
  it("does not claim denial while the access snapshot is still in flight", () => {
    mockUseAccess.mockReturnValue(accessLoading);

    render(<StockLevelsPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("shows Access Restricted once inventory:stock:read has actually said no", () => {
    mockUseAccess.mockReturnValue(accessDenied);

    render(<StockLevelsPage />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders the stock page normally when access is granted", () => {
    mockUseAccess.mockReturnValue(accessGranted);

    render(<StockLevelsPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.getByRole("heading", { name: /stock levels/i })).toBeInTheDocument();
  });
});
