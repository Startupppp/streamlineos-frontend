"use client";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseCategories = jest.fn();
const mockUseUpdateCategory = jest.fn();

const accessLoading = { data: undefined, isLoading: true };

const accessGranted = {
  data: {
    isOrgOwner: false,
    scopes: {
      "inventory:products:read": "all",
      "inventory:products:create": "all",
      "inventory:products:update": "all",
    },
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

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: () => false,
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/inventory", () => ({
  useCategories: () => mockUseCategories(),
  useUpdateCategory: () => mockUseUpdateCategory(),
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

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
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

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
}));

jest.mock("@animateicons/react/lucide", () => ({
  EllipsisIcon: () => null,
}));

jest.mock("@/features/inventory/components/inventory-empty-state", () => ({
  InventoryEmptyState: ({ title }: { title?: string }) => (
    <div data-testid="inventory-empty-state">{title ?? "Empty"}</div>
  ),
}));

jest.mock("@/features/inventory/components/category-create-form", () => ({
  CategoryCreateForm: () => <div data-testid="category-create-form" />,
}));

jest.mock("@/features/inventory/components/category-edit-sheet", () => ({
  CategoryEditSheet: () => null,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyProductsIllustration: () => null,
  EmptySearchIllustration: () => null,
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  FILTER_SELECT_TRIGGER: "",
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import CategoriesPage from "./page";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(accessGranted);
  mockUseCategories.mockReturnValue(emptyQuery());
  mockUseUpdateCategory.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
});

describe("CategoriesPage — access is three-valued, not a boolean", () => {
  it("does not claim denial while the access snapshot is still in flight", () => {
    mockUseAccess.mockReturnValue(accessLoading);

    render(<CategoriesPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("shows Access Restricted once inventory:products:read has actually said no", () => {
    mockUseAccess.mockReturnValue(accessDenied);

    render(<CategoriesPage />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders the categories page normally when access is granted", () => {
    mockUseAccess.mockReturnValue(accessGranted);

    render(<CategoriesPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.getByRole("heading", { name: /categories/i })).toBeInTheDocument();
  });
});
