"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import { ProjectCustomersPage } from "./project-customers-page";

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
  useSearchParams: () => ({ get: () => null, toString: () => "" }),
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/customers",
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, filters }: { children: React.ReactNode; filters?: React.ReactNode }) => (
    <div>
      {filters}
      {children}
    </div>
  ),
}));

jest.mock("@/components/illustrations", () => ({
  EmptyCompaniesIllustration: () => <div aria-hidden />,
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

const mockUseCan = jest.fn<boolean, [string]>(() => false);
jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => mockUseCan(permission),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) =>
    mockUsePageState(...args),
}));

const mockUseProjectCustomers = jest.fn();
jest.mock("@/hooks/api/build/customers", () => ({
  useProjectCustomers: (...args: unknown[]) => mockUseProjectCustomers(...args),
}));

jest.mock("./use-customer-display-prefs", () => ({
  useCustomerDisplayPrefs: () => ({
    prefs: { showDomain: false, showSize: false, showIndustry: false },
    toggle: jest.fn(),
  }),
}));

jest.mock("./customer-filter-popover", () => ({
  CustomerFilterPopover: () => null,
  ActiveCustomerFilterChips: () => null,
  SIZE_OPTIONS: [],
}));

jest.mock("./customer-display-prefs-popover", () => ({
  CustomerDisplayPrefsPopover: () => null,
}));

jest.mock("./customer-table", () => ({
  CustomerTable: () => <div>Customer table</div>,
}));

jest.mock("@/lib/motion-variants", () => ({
  useMotionVariants: () => ({ staggerContainer: {}, fadeUp: {} }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(false);
  mockUseProjectCustomers.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("AP-9: ProjectCustomersPage must resolve through usePageState not a bare boolean useCan gate", () => {
  it("does not show the no-permission description while the access snapshot is still loading — useCan returns false during this window so a page gated on !useCan wrongly denies permitted users", () => {
    mockUseCan.mockReturnValue(false);
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<ProjectCustomersPage />);

    expect(
      screen.queryByText("You don't have permission to view customers."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view when the access snapshot confirms the permission is not held", () => {
    mockUseCan.mockReturnValue(false);
    mockUsePageState.mockReturnValue({
      kind: "denied",
      permission: "build:customers:view",
    });

    render(<ProjectCustomersPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders the customers table when usePageState resolves to ready", () => {
    mockUseCan.mockReturnValue(true);
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseProjectCustomers.mockReturnValue({
      data: { data: [], pagination: { hasMore: false, nextCursor: undefined } },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ProjectCustomersPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
    expect(
      screen.queryByText("You don't have permission to view customers."),
    ).not.toBeInTheDocument();
  });

  it("passes permission build:customers:view and the error to usePageState so the 402 upgrade path is preserved", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseProjectCustomers.mockReturnValue({
      data: { data: [], pagination: { hasMore: false } },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ProjectCustomersPage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: "build:customers:view",
        error: undefined,
      }),
    );
  });
});
